const bcrypt = require('bcryptjs');
const { db, initDB } = require('./models/db');

// quick seed script to populate the db with some test data
// run with: npm run seed

initDB();

console.log('Seeding database...');

// clear existing data
db.exec('DELETE FROM records; DELETE FROM users;');

// create users
const hashedPassword = bcrypt.hashSync('password123', 10);

const insertUser = db.prepare(
  'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
);

const admin = insertUser.run('Amna Eqbal', 'admin@example.com', hashedPassword, 'admin');
const analyst = insertUser.run('Priya Analyst', 'analyst@example.com', hashedPassword, 'analyst');
const viewer = insertUser.run('Rahul Viewer', 'viewer@example.com', hashedPassword, 'viewer');

console.log('Created 3 users (password: password123 for all)');

// seed some financial records
const insertRecord = db.prepare(
  'INSERT INTO records (user_id, amount, type, category, date, notes) VALUES (?, ?, ?, ?, ?, ?)'
);

const sampleRecords = [
  [admin.lastInsertRowid, 50000, 'income', 'Salary', '2025-01-15', 'Monthly salary'],
  [admin.lastInsertRowid, 12000, 'income', 'Freelance', '2025-01-20', 'Web dev project'],
  [admin.lastInsertRowid, 8500, 'expense', 'Rent', '2025-01-05', 'Jan rent'],
  [admin.lastInsertRowid, 2500, 'expense', 'Groceries', '2025-01-10', null],
  [admin.lastInsertRowid, 1500, 'expense', 'Transport', '2025-01-12', 'Metro pass + fuel'],
  [admin.lastInsertRowid, 50000, 'income', 'Salary', '2025-02-15', 'Monthly salary'],
  [admin.lastInsertRowid, 8500, 'expense', 'Rent', '2025-02-05', 'Feb rent'],
  [admin.lastInsertRowid, 3200, 'expense', 'Groceries', '2025-02-08', null],
  [admin.lastInsertRowid, 999, 'expense', 'Subscription', '2025-02-01', 'Netflix + Spotify'],
  [admin.lastInsertRowid, 50000, 'income', 'Salary', '2025-03-15', 'Monthly salary'],
  [admin.lastInsertRowid, 5000, 'income', 'Freelance', '2025-03-22', 'Logo design'],
  [admin.lastInsertRowid, 8500, 'expense', 'Rent', '2025-03-05', 'March rent'],
  [admin.lastInsertRowid, 15000, 'expense', 'Shopping', '2025-03-18', 'New laptop accessories'],
  [admin.lastInsertRowid, 2000, 'expense', 'Groceries', '2025-03-10', null],
  [admin.lastInsertRowid, 800, 'expense', 'Transport', '2025-03-14', 'Uber rides'],
];

const insertMany = db.transaction((records) => {
  for (const r of records) {
    insertRecord.run(...r);
  }
});

insertMany(sampleRecords);

console.log(`Created ${sampleRecords.length} financial records`);
console.log('Done! You can now start the server with: npm start');
