import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCB_pSS1-1VFkdHjzN2W8ozW55W0lF3BD8',
  authDomain: 'anexar-9820c.firebaseapp.com',
  projectId: 'anexar-9820c',
  storageBucket: 'anexar-9820c.firebasestorage.app',
  messagingSenderId: '1069657020241',
  appId: '1:1069657020241:web:741f0a7c4ecf003aede570'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const newEvents = [
  "Financial Express Commercial Vehicle Conclave",
  "India E-Mobility Show 2023",
  "Advanced Automotive Tech Forum 2023",
  "Commercial Vehicle Forum",
  "2nd India E-Commerce Summit 2023",
  "Urban Mobility India Conference and Expo",
  "Auto EV India 2023",
  "Banking Frontiers NBFCs Tomorrow",
  "Banking Frontiers Technoviti And Finnoviti",
  "India NBFC Summit & Awards 2023",
  "India Banking Summit And Awards",
  "Elets The Banking and Finance Post Gamechanger Summit",
  "ET BFSI CIO Conclave 2023",
  "BFSI Innovation and Technology Summit",
  "ET CFO Turning Point",
  "Banking and Finance: The Key to India's Recovery?",
  "The Banking Revolution",
  "IBEX India 11th International Trade Fair and Conference on Banking Technology, Equipment & Services",
  "World BFSI Congress and Awards 2023",
  "13th NBFC100 Tech Summit",
  "ET BFSI NBFC Connect",
  "Elets BFSI CTO Summit",
  "Zinnov Confluence",
  "Nasscom SME Confluence",
  "Nasscom Global Inclusion Summit",
  "Nasscom Annual Technology Conference",
  "Nasscom NasTech",
  "YourStory TechSparks",
  "BFSI and Fintech Summit 2023",
  "Nasscom Technology and Leadership Forum 2023",
  "Fintech Festival India",
  "India Fintech Conclave",
  "Fintech India Innovation Awards",
  "Festival Of Fintech 2023",
  "VCCircle FinServ Summit",
  "Global Fintech Fest 2023",
  "Fintech India Summit and Awards",
  "India FinTech Forum’s IFTA 2022",
  "NBFC Fintech Conclave and Awards 2023",
  "Payments Innovation Summit, 8th June, Mumbai",
  "BNPL & DL India Show 2023",
  "2ND EDITION FINTECH INDIA SUMMIT & AWARDS 2023",
  "NBFC & FinTech EXCELLENCE AWARDS 2023",
  "The Economic Times Best Organizations for Women",
  "BW Nurturing Talent for Future Conclave",
  "People First HR Excellence Awards",
  "Tech HR 2023",
  "People Matters Total Rewards And Wellbeing Conference (8th Edition)",
  "The Happiest Workplaces Awards",
  "AmbitionBox Best Places to Work in India Awards 2023",
  "Are You In The List",
  "Best Workplaces for Innovators 2023",
  "Inc. Best Workplaces",
  "Digital Workplace Summit",
  "HR Distinction Awards",
  "The Economic Times Human Capital Awards",
  "Nextech India HR Summit",
  "ET Future Ready Organisations",
  "HR Tech & Summit 2023",
  "Great Place To work for all summit",
  "BW Marketing world D2C summit| Razorpay",
  "Techsparks Mumbai",
  "CX Plus 2023 by ET Brand Equity",
  "Internet Commerce Summit",
  "Gartner Marketing Conference and Symposium",
  "Future of Retail & E-commerce Summit & Awards 2023",
  "DIGIXX AWARDS 2022 - Real Awards for Real Achiever's",
  "IRec (The Indian Retail & eRetail Congress) 2023",
  "D2C India Bengaluru",
  "D2C Summit and Awards",
  "Internet Commerce Summit",
  "ET Brand Equity Martech Asia 2023 summit",
  "e4M D2C Revolution 2023",
  "D2C FOUNDERS MEET",
  "Inc42:India's Largest D2C & Ecommerce Conference",
  "ScaleUp by Inc42"
];

async function run() {
  const snap = await getDocs(collection(db, "events_awards"));
  
  let matchedCount = 0;
  let concludedCount = 0;
  let upcomingCount = 0;
  
  snap.forEach(docSnap => {
    const d = docSnap.data();
    const name = d.event_name || d.name || '';
    
    // Check if this event name matches one of the new events (fuzzy checking by contains or lowercase)
    const isNew = newEvents.some(ne => {
      const cleanNe = ne.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanNe.includes(cleanName) || cleanName.includes(cleanNe);
    });
    
    if (isNew) {
      matchedCount++;
      if (d.status === 'CONCLUDED') {
        concludedCount++;
      } else {
        upcomingCount++;
      }
    }
  });
  
  console.log(`Matched newly added events: ${matchedCount}`);
  console.log(`Concluded: ${concludedCount}`);
  console.log(`Upcoming: ${upcomingCount}`);
  process.exit(0);
}

run().catch(console.error);
