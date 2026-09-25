export const BRANCH = {
  name: "Apollo Hospitals (Chennai)",
  address: "21 Greams Lane, Off Greams Road, Chennai 600006",
  phone: "0332222221",
};

export const STAFF = [
  { name: "Dr. Arjun Desai", dept: "Cardiology", room: "101", phone: "7003636111" },
  { name: "Sunita Rao", dept: "General Medicine", room: "205", phone: "7003636112" },
  { name: "Dr. Priya Sharma", dept: "Orthopedics", room: "310", phone: "7003636113" },
  { name: "Dr. Vikram Nair", dept: "Neurology", room: "408", phone: "7003636114" },
];

export const DEPTS = ["Cardiology", "General Medicine", "Orthopedics", "Neurology", "Oncology", "Pediatrics"];
export const PLATFORMS = ["Swiggy", "Zomato", "Amazon", "Flipkart", "Dunzo", "BlueDart", "FedEx"];

export const seedVisitors = [
  { id: "V001", fn: "Rahul", ln: "Mehta", phone: "9876543210", type: "Meeting", host: "Dr. Arjun Desai", dept: "Cardiology", status: "Pending", time: "09:15", ini: "RM" },
  { id: "V002", fn: "Suresh", ln: "Kumar", phone: "9876543211", type: "Delivery", platform: "Swiggy", recipient: "Front Desk", status: "Approved", time: "09:30", ini: "SK" },
  { id: "V003", fn: "Priya", ln: "Nair", phone: "9876543212", type: "Meeting", host: "Sunita Rao", dept: "General Medicine", status: "In", time: "08:45", ini: "PN" },
  { id: "V004", fn: "Amit", ln: "Shah", phone: "9876543213", type: "Delivery", platform: "BlueDart", recipient: "Pharmacy", status: "Out", time: "07:30", ini: "AS" },
];

export const feedPosts = [
  { id: 1, author: "Dr. Arjun Desai", role: "Cardiologist · Apollo Chennai", ini: "AD", content: "Excited to share our latest findings on minimally invasive cardiac procedures.", likes: 142, comments: 28, time: "2h" },
  { id: 2, author: "Siemens Healthineers", role: "Medical Technology Company", ini: "SH", content: "Introducing our next-gen MRI system with 50% reduction in scan time.", likes: 89, comments: 15, time: "4h" },
];

export const marketItems = [
  { id: 1, name: "Artis Pheno", vendor: "Siemens", cat: "Imaging", price: "On Request" },
  { id: 2, name: "HeartMate 3", vendor: "Abbott", cat: "Cardiac", price: "On Request" },
  { id: 3, name: "ACUSON Sequoia", vendor: "Siemens", cat: "Ultrasound", price: "₹85L" },
];

export const jobListings = [
  { id: 1, title: "Senior Cardiologist", org: "Apollo Hospitals", loc: "Chennai", exp: "10+ yrs", posted: "2d" },
  { id: 2, title: "MedTech Sales Manager", org: "Siemens Healthineers", loc: "Mumbai", exp: "5-8 yrs", posted: "1d" },
];

export const messages = [
  { id: 1, from: "Dr. Arjun Desai", ini: "AD", last: "Confirmed for tomorrow's demo", time: "10:32 AM", unread: 2 },
  { id: 2, from: "Siemens Healthineers", ini: "SH", last: "PO #4521 has been processed", time: "9:15 AM", unread: 0 },
];
