const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

const googleClientSecret = defineSecret('GOOGLE_OAUTH_CLIENT_SECRET');

// Public OAuth Client ID - safe to hardcode, matches VITE_GOOGLE_CLIENT_ID used for login.
const GOOGLE_CLIENT_ID = '1069657020241-305f0ickrks7s8ske612fqfhjo889jbj.apps.googleusercontent.com';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy';

function getDb() {
    if (!admin.apps.length) admin.initializeApp();
    return admin.firestore();
}

// Exchanges the one-time authorization code (from the full-page redirect consent
// flow, which requested access_type=offline + prompt=consent) for a refresh token,
// and stores it server-side. The refresh token is never sent back to the browser.
exports.exchangeGoogleAuthCode = onRequest(
    { timeoutSeconds: 30, memory: '256MiB', cors: true, secrets: [googleClientSecret] },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const { code, email, redirectUri } = req.body || {};
        if (!code || !email || !redirectUri) {
            res.status(400).json({ error: 'code, email, and redirectUri are required' });
            return;
        }

        const emailLower = email.toLowerCase().trim();
        if (!emailLower.endsWith('@themavericksindia.com')) {
            res.status(403).json({ error: 'Only @themavericksindia.com accounts can connect a calendar' });
            return;
        }

        try {
            const tokenRes = await fetch(TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: googleClientSecret.value(),
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code'
                })
            });

            const tokenData = await tokenRes.json();
            if (!tokenRes.ok) {
                console.error('[exchangeGoogleAuthCode] Token exchange failed:', tokenData);
                res.status(400).json({ error: tokenData.error_description || tokenData.error || 'Token exchange failed' });
                return;
            }

            if (!tokenData.refresh_token) {
                res.status(400).json({ error: 'Google did not return a refresh token. Please try connecting again.' });
                return;
            }

            const db = getDb();
            await db.collection('calendar_tokens').doc(emailLower).set({
                email: emailLower,
                refreshToken: tokenData.refresh_token,
                scope: tokenData.scope || '',
                connectedAt: new Date().toISOString()
            });

            // Non-secret status flag only - safe for the client Firestore SDK to read
            // directly so the UI knows whether to show the "Connect Calendar" prompt.
            await db.collection('calendar_connection_status').doc(emailLower).set({
                email: emailLower,
                connected: true,
                connectedAt: new Date().toISOString()
            });

            res.json({ success: true });
        } catch (err) {
            console.error('[exchangeGoogleAuthCode] Exception:', err);
            res.status(500).json({ error: err.message || 'Failed to connect calendar' });
        }
    }
);

// Looks up a team member's stored refresh token, mints a fresh access token, and
// queries their real primary-calendar free/busy for the given day.
exports.getTeamMemberAvailability = onRequest(
    { timeoutSeconds: 30, memory: '256MiB', cors: true, secrets: [googleClientSecret] },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const { email, date } = req.body || {};
        if (!email || !date) {
            res.status(400).json({ error: 'email and date are required' });
            return;
        }
        const emailLower = email.toLowerCase().trim();

        try {
            const db = getDb();
            const tokenDoc = await db.collection('calendar_tokens').doc(emailLower).get();

            if (!tokenDoc.exists) {
                res.json({ connected: false, busy: [] });
                return;
            }

            const { refreshToken } = tokenDoc.data();

            const tokenRes = await fetch(TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: googleClientSecret.value(),
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token'
                })
            });

            const tokenData = await tokenRes.json();
            if (!tokenRes.ok) {
                console.warn(`[getTeamMemberAvailability] Refresh failed for ${emailLower}:`, tokenData);
                if (tokenData.error === 'invalid_grant') {
                    // Refresh token was revoked/expired - clean up so the UI re-prompts.
                    await db.collection('calendar_tokens').doc(emailLower).delete();
                    await db.collection('calendar_connection_status').doc(emailLower).set(
                        { email: emailLower, connected: false },
                        { merge: true }
                    );
                }
                res.json({ connected: false, busy: [] });
                return;
            }

            const start = new Date(date + 'T00:00:00');
            const end = new Date(date + 'T23:59:59');

            const freeBusyRes = await fetch(FREEBUSY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokenData.access_token}`
                },
                body: JSON.stringify({
                    timeMin: start.toISOString(),
                    timeMax: end.toISOString(),
                    items: [{ id: 'primary' }]
                })
            });

            const freeBusyData = await freeBusyRes.json();
            if (!freeBusyRes.ok) {
                console.warn(`[getTeamMemberAvailability] FreeBusy query failed for ${emailLower}:`, freeBusyData);
                res.json({ connected: true, busy: [] });
                return;
            }

            const busy = (freeBusyData.calendars && freeBusyData.calendars.primary && freeBusyData.calendars.primary.busy) || [];
            res.json({ connected: true, busy });
        } catch (err) {
            console.error('[getTeamMemberAvailability] Exception:', err);
            res.status(500).json({ error: err.message || 'Failed to check availability' });
        }
    }
);

exports.createCalendarEvent = onRequest(
    { timeoutSeconds: 30, memory: '256MiB', cors: true, secrets: [googleClientSecret] },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const { meetingId, email, approverEmail, date, slots, topic, clientEmail, memberName, isCustomTime, customStartTime, customEndTime, timeZone } = req.body || {};
        if (!meetingId || (!email && !approverEmail) || !date) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        
        if (isCustomTime && (!customStartTime || !customEndTime)) {
            res.status(400).json({ error: 'Missing custom times' });
            return;
        } else if (!isCustomTime && (!slots || !slots.length)) {
            res.status(400).json({ error: 'Missing slots' });
            return;
        }

        const db = getDb();
        let emailToUse = (email || '').toLowerCase().trim();
        let tokenDoc = await db.collection('calendar_tokens').doc(emailToUse).get();

        const getToken = (docSnap) => {
            if (!docSnap || !docSnap.exists) return null;
            const data = docSnap.data();
            return data?.refreshToken || data?.refresh_token || null;
        };

        let refreshToken = getToken(tokenDoc);

        if (!refreshToken && approverEmail) {
            const fallbackEmail = approverEmail.toLowerCase().trim();
            const fallbackDoc = await db.collection('calendar_tokens').doc(fallbackEmail).get();
            refreshToken = getToken(fallbackDoc);
            if (refreshToken) {
                tokenDoc = fallbackDoc;
                emailToUse = fallbackEmail;
            }
        }

        if (!refreshToken) {
            res.status(404).json({ error: `No connected Google Calendar found for ${emailToUse || approverEmail}. Please connect your Google Calendar via the top banner.` });
            return;
        }

        try {
            // 2. Get fresh Access Token
            const tokenRes = await fetch(TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: googleClientSecret.value(),
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token'
                })
            });

            const tokenData = await tokenRes.json();
            if (!tokenRes.ok) {
                console.error(`[createCalendarEvent] Token refresh failed for ${emailToUse}:`, tokenData);
                res.status(401).json({ error: 'Failed to refresh calendar token. User may need to reconnect Google Calendar.' });
                return;
            }

            // 3. Calculate Start and End Times formatted for local timezone
            let startTimeStr, endTimeStr;
            
            if (isCustomTime) {
                startTimeStr = customStartTime;
                endTimeStr = customEndTime;
            } else {
                const sortedSlots = slots.sort();
                startTimeStr = sortedSlots[0];
                const lastSlot = sortedSlots[sortedSlots.length - 1];
                
                const [h, m] = lastSlot.split(':').map(Number);
                const endDate = new Date(2000, 0, 1, h, m + 15);
                endTimeStr = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
            }

            const userTimeZone = timeZone || 'Asia/Kolkata';
            const startIso = `${date}T${startTimeStr}:00`;
            const endIso = `${date}T${endTimeStr}:00`;

            // 4. Create Calendar Event
            const eventPayload = {
                summary: `Meeting: ${topic || 'Internal Sync'}`,
                description: `Requested by: ${clientEmail || 'Client'}\nRepresentative: ${memberName || emailToUse}`,
                start: {
                    dateTime: startIso,
                    timeZone: userTimeZone
                },
                end: {
                    dateTime: endIso,
                    timeZone: userTimeZone
                }
            };

            if (clientEmail && clientEmail.includes('@')) {
                eventPayload.attendees = [{ email: clientEmail }];
            }

            const EVENT_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all';
            const eventRes = await fetch(EVENT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokenData.access_token}`
                },
                body: JSON.stringify(eventPayload)
            });

            const eventData = await eventRes.json();
            if (!eventRes.ok) {
                console.error(`[createCalendarEvent] Event creation failed:`, eventData);
                res.status(400).json({ error: eventData.error?.message || 'Failed to create Google Calendar event' });
                return;
            }

            // 5. Update Meeting Status in DB
            await db.collection('meetings').doc(meetingId).update({
                status: 'accepted',
                calendarEventId: eventData.id
            });

            // 6. Clean up notifications
            const notifs = await db.collection('notifications').where('meetingId', '==', meetingId).get();
            const batch = db.batch();
            notifs.forEach(n => {
                batch.delete(n.ref);
            });
            await batch.commit();

            res.json({ success: true, eventId: eventData.id });
        } catch (err) {
            console.error('[createCalendarEvent] Exception:', err);
            res.status(500).json({ error: err.message || 'Failed to create event' });
        }
    }
);
