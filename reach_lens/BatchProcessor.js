const { processUrlInternal } = require('./AnalysisController');
const db = require('../db');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

class BatchProcessor {
    static async processJob(jobId, filePath, version = 'v5') {
        try {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);

            const totalUrls = data.length;

            // Initialize progress list
            const initialResults = data.map((row, index) => {
                const url = row.url || row.URL || row.Link || row.link || Object.values(row)[0] || '';
                return {
                    id: `MAV-${String(index + 1).padStart(3, '0')}`,
                    url: url,
                    sentiment: 'Pending',
                    mentions: '-',
                    reach: '-',
                    status: 'Pending'
                };
            });

            await db.query(
                'UPDATE batch_jobs SET total_urls = $1, status = $2, results = $3 WHERE id = $4',
                [totalUrls, 'processing', JSON.stringify(initialResults), jobId]
            );

            const results = [];
            const CONCURRENCY = 3;

            for (let i = 0; i < data.length; i += CONCURRENCY) {
                const chunk = data.slice(i, i + CONCURRENCY);
                console.log(`Processing batch chunk ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(data.length / CONCURRENCY)}`);
                
                const chunkPromises = chunk.map(async (row, index) => {
                    const currentIndex = i + index;
                    const url = initialResults[currentIndex].url;
                    
                    if (typeof url !== 'string' || !url.startsWith('http')) {
                        const failedRow = {
                            id: `MAV-${String(currentIndex + 1).padStart(3, '0')}`,
                            url: url,
                            sentiment: 'N/A',
                            mentions: 0,
                            reach: 'Invalid URL',
                            status: 'Failed'
                        };
                        initialResults[currentIndex] = failedRow;
                        return { ...row, 'Reach Estimation': 'Invalid URL', 'Sentiment': 'N/A', 'Mentions': 0 };
                    }

                    try {
                        console.log(`Processing item ${currentIndex + 1}/${totalUrls}: ${url}`);
                        const result = await processUrlInternal(url, version);
                        const completedRow = {
                            id: `MAV-${String(currentIndex + 1).padStart(3, '0')}`,
                            url: url,
                            sentiment: result.sentimentScore > 1 ? 'Positive' : result.sentimentScore < -1 ? 'Negative' : 'Neutral',
                            mentions: result.totalMentions,
                            reach: result.estimatedReach,
                            status: 'Completed'
                        };
                        initialResults[currentIndex] = completedRow;
                        
                        return {
                            ...row,
                            'Reach Estimation': result.estimatedReach,
                            'Sentiment': completedRow.sentiment,
                            'Mentions': result.totalMentions
                        };
                    } catch (error) {
                        console.error(`Error processing URL ${url}:`, error);
                        const failedRow = {
                            id: `MAV-${String(currentIndex + 1).padStart(3, '0')}`,
                            url: url,
                            sentiment: 'N/A',
                            mentions: 0,
                            reach: 'Failed',
                            status: 'Failed'
                        };
                        initialResults[currentIndex] = failedRow;
                        
                        return { ...row, 'Reach Estimation': 'Failed', 'Sentiment': 'N/A', 'Mentions': 0 };
                    }
                });

                const chunkResults = await Promise.all(chunkPromises);
                results.push(...chunkResults);

                // Update progress and intermediate results in DB
                await db.query(
                    'UPDATE batch_jobs SET processed_urls = $1, results = $2 WHERE id = $3',
                    [Math.min(i + CONCURRENCY, totalUrls), JSON.stringify(initialResults), jobId]
                );
                
                // Buffer between chunks to avoid Google block
                if (i + CONCURRENCY < data.length) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }

            // Generate structured output file
            const formattedResults = initialResults.map(item => ({
                'ID': item.id,
                'Article URL': item.url,
                'Sentiment': item.sentiment,
                'Mentions': item.mentions,
                'Estimated Reach': item.reach,
                'Status': item.status === 'Completed' ? 'Verified' : item.status
            }));
            
            const newSheet = xlsx.utils.json_to_sheet(formattedResults);
            const newWorkbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(newWorkbook, newSheet, 'Results');

            const resultFileName = `result_${jobId}.xlsx`;
            // Save inside the server/uploads directory
            const resultPath = path.resolve(__dirname, '../uploads', resultFileName);
            
            if (!fs.existsSync(path.dirname(resultPath))) {
                fs.mkdirSync(path.dirname(resultPath), { recursive: true });
            }

            xlsx.writeFile(newWorkbook, resultPath);

            await db.query(
                'UPDATE batch_jobs SET status = $1, result_file = $2, results = $3 WHERE id = $4',
                ['completed', resultFileName, JSON.stringify(initialResults), jobId]
            );
        } catch (error) {
            console.error(`Batch process ${jobId} failed:`, error);
            try {
                await db.query('UPDATE batch_jobs SET status = $1 WHERE id = $2', ['failed', jobId]);
            } catch (dbErr) {
                console.error('Failed to update job status to failed:', dbErr);
            }
        }
    }
}

module.exports = BatchProcessor;
