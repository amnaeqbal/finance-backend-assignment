/**
 * Basic integration tests for the finance API
 * Run with: npm test
 *
 * Uses Node's built-in test runner (no extra deps needed)
 * Tests hit the actual API with a test database
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

const BASE = 'http://localhost:3001';
let adminToken, analystToken, viewerToken;
let testRecordId;

// helper — keeps fetch calls clean
async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

// we need the server running on port 3001 with a test db
// start it before tests: DB_PATH=/tmp/test-finance.db PORT=3001 node src/app.js

describe('Auth', () => {
  it('should register first user as admin', async () => {
    const { status, data } = await api('/auth/register', {
      method: 'POST',
      body: { name: 'Test Admin', email: 'testadmin@test.com', password: 'test123' },
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(data.user.role, 'admin');
    adminToken = data.token;
  });

  it('should login with correct credentials', async () => {
    const { status, data } = await api('/auth/login', {
      method: 'POST',
      body: { email: 'testadmin@test.com', password: 'test123' },
    });
    assert.strictEqual(status, 200);
    assert.ok(data.token);
    adminToken = data.token;
  });

  it('should reject wrong password', async () => {
    const { status } = await api('/auth/login', {
      method: 'POST',
      body: { email: 'testadmin@test.com', password: 'wrong' },
    });
    assert.strictEqual(status, 401);
  });

  it('should register second user as viewer by default', async () => {
    const { status, data } = await api('/auth/register', {
      method: 'POST',
      body: { name: 'Test Viewer', email: 'testviewer@test.com', password: 'test123' },
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(data.user.role, 'viewer');
    viewerToken = data.token;
  });

  it('should reject registration with missing fields', async () => {
    const { status, data } = await api('/auth/register', {
      method: 'POST',
      body: { email: 'bad@test.com' },
    });
    assert.strictEqual(status, 400);
    assert.ok(data.details.length > 0);
  });

  it('should reject duplicate email', async () => {
    const { status } = await api('/auth/register', {
      method: 'POST',
      body: { name: 'Dupe', email: 'testadmin@test.com', password: 'test123' },
    });
    assert.strictEqual(status, 409);
  });
});

describe('Records (CRUD)', () => {
  it('should create a record as admin', async () => {
    const { status, data } = await api('/records', {
      method: 'POST',
      token: adminToken,
      body: { amount: 5000, type: 'income', category: 'Salary', date: '2025-03-15', notes: 'March salary' },
    });
    assert.strictEqual(status, 201);
    testRecordId = data.record.id;
  });

  it('should reject record creation from viewer', async () => {
    const { status } = await api('/records', {
      method: 'POST',
      token: viewerToken,
      body: { amount: 100, type: 'income', category: 'Test', date: '2025-03-15' },
    });
    assert.strictEqual(status, 403);
  });

  it('should reject invalid record data', async () => {
    const { status, data } = await api('/records', {
      method: 'POST',
      token: adminToken,
      body: { amount: -5, type: 'invalid' },
    });
    assert.strictEqual(status, 400);
    assert.ok(data.details.length >= 2);
  });

  it('should get records with pagination', async () => {
    // add a couple more records
    await api('/records', {
      method: 'POST', token: adminToken,
      body: { amount: 2000, type: 'expense', category: 'Rent', date: '2025-03-05', notes: 'March rent' },
    });
    await api('/records', {
      method: 'POST', token: adminToken,
      body: { amount: 500, type: 'expense', category: 'Food', date: '2025-03-10' },
    });

    const { status, data } = await api('/records?page=1&limit=2', { token: adminToken });
    assert.strictEqual(status, 200);
    assert.strictEqual(data.records.length, 2);
    assert.strictEqual(data.pagination.total, 3);
  });

  it('should filter records by type', async () => {
    const { data } = await api('/records?type=income', { token: adminToken });
    assert.ok(data.records.every(r => r.type === 'income'));
  });

  it('should search records by notes', async () => {
    const { data } = await api('/records?search=salary', { token: adminToken });
    assert.ok(data.records.length > 0);
    assert.ok(data.records[0].notes.toLowerCase().includes('salary'));
  });

  it('should update a record', async () => {
    const { status } = await api(`/records/${testRecordId}`, {
      method: 'PUT', token: adminToken,
      body: { amount: 6000 },
    });
    assert.strictEqual(status, 200);

    const { data } = await api(`/records/${testRecordId}`, { token: adminToken });
    assert.strictEqual(data.record.amount, 6000);
  });

  it('should soft delete a record', async () => {
    const { status } = await api(`/records/${testRecordId}`, {
      method: 'DELETE', token: adminToken,
    });
    assert.strictEqual(status, 200);

    // should no longer appear in listing
    const { data } = await api(`/records/${testRecordId}`, { token: adminToken });
    assert.strictEqual(data.error, 'Record not found');
  });

  it('should restore a soft-deleted record', async () => {
    const { status } = await api(`/records/${testRecordId}/restore`, {
      method: 'PATCH', token: adminToken,
    });
    assert.strictEqual(status, 200);

    // should be back
    const { data } = await api(`/records/${testRecordId}`, { token: adminToken });
    assert.strictEqual(data.record.id, testRecordId);
  });

  it('viewer should be able to read records', async () => {
    const { status } = await api('/records', { token: viewerToken });
    assert.strictEqual(status, 200);
  });
});

describe('Dashboard', () => {
  it('should return summary with income, expenses, net', async () => {
    const { status, data } = await api('/dashboard/summary', { token: adminToken });
    assert.strictEqual(status, 200);
    assert.ok('totalIncome' in data);
    assert.ok('totalExpenses' in data);
    assert.ok('netBalance' in data);
    assert.strictEqual(data.netBalance, data.totalIncome - data.totalExpenses);
  });

  it('should return category breakdown', async () => {
    const { status, data } = await api('/dashboard/category-breakdown', { token: adminToken });
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.breakdown));
    assert.ok(data.breakdown.length > 0);
    assert.ok('category' in data.breakdown[0]);
  });

  it('should return recent transactions', async () => {
    const { status, data } = await api('/dashboard/recent?limit=5', { token: adminToken });
    assert.strictEqual(status, 200);
    assert.ok(data.transactions.length <= 5);
  });

  it('should return monthly summary', async () => {
    const { status, data } = await api('/dashboard/monthly', { token: adminToken });
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.monthly));
    if (data.monthly.length > 0) {
      assert.ok('income' in data.monthly[0]);
      assert.ok('expenses' in data.monthly[0]);
      assert.ok('net' in data.monthly[0]);
    }
  });
});

describe('User Management', () => {
  it('admin should list all users', async () => {
    const { status, data } = await api('/users', { token: adminToken });
    assert.strictEqual(status, 200);
    assert.ok(data.users.length >= 2);
  });

  it('viewer should not access user management', async () => {
    const { status } = await api('/users', { token: viewerToken });
    assert.strictEqual(status, 403);
  });

  it('should change user role', async () => {
    // get viewer's id
    const { data: usersData } = await api('/users', { token: adminToken });
    const viewer = usersData.users.find(u => u.email === 'testviewer@test.com');

    const { status } = await api(`/users/${viewer.id}/role`, {
      method: 'PATCH', token: adminToken,
      body: { role: 'analyst' },
    });
    assert.strictEqual(status, 200);
  });

  it('should toggle user status', async () => {
    const { data: usersData } = await api('/users', { token: adminToken });
    const other = usersData.users.find(u => u.email === 'testviewer@test.com');

    const { status, data } = await api(`/users/${other.id}/status`, {
      method: 'PATCH', token: adminToken,
    });
    assert.strictEqual(status, 200);
  });
});

describe('Access Control', () => {
  it('should reject requests without token', async () => {
    const { status } = await api('/records');
    assert.strictEqual(status, 401);
  });

  it('should reject requests with bad token', async () => {
    const { status } = await api('/records', { token: 'garbage.token.here' });
    assert.strictEqual(status, 401);
  });

  it('should return 404 for unknown routes', async () => {
    const { status } = await api('/nonexistent');
    assert.strictEqual(status, 404);
  });
});
