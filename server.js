/**
 * KLKT Backend Server & Admin Control Center
 * 100% Free - Runs locally on Node.js with built-in modules (Zero dependencies required!)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Default initial database state matching KLKT app screenshots
const defaultDb = {
  user: {
    name: 'Kelvin Wakaba',
    email: 'kelvinwakaba46@gmail.com',
    memberSince: 'October 2026',
    balance: 0.0,
    totalUploads: 0,
    photosCount: 0,
    videosCount: 0,
    submittedHours: 0,
    approvedHours: 0,
    submittedTasks: 0,
    approvedTasks: 0,
    payoutMethod: null,
  },
  tasks: [
    {
      id: 'task-1',
      title: 'Salon & Spa Services',
      category: 'video',
      requirement: 'RECORD ONLY 1 RECORDING PER TASK',
      pay: 35.0,
      description: 'Record first-person walkthrough showing interior layout, treatment stations, and service areas with smooth camera panning.',
      duration: '15 mins',
      spots: 12,
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-2',
      title: 'Hotel & Lodging',
      category: 'video',
      requirement: 'RECORD ONLY 1 RECORDING PER TASK',
      pay: 45.0,
      description: 'Capture lobby, reception area, guest corridor, and standard room amenities with steady chest or head mount.',
      duration: '25 mins',
      spots: 8,
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-3',
      title: 'Restaurant and Commercial kitchen',
      category: 'video',
      requirement: 'RECORD ONLY 1 RECORDING PER TASK',
      pay: 50.0,
      description: 'Record dining area ambient scan and non-operational prep surfaces under consistent artificial lighting.',
      duration: '30 mins',
      spots: 5,
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  ],
  submissions: [
    {
      id: 'sub-sample-1',
      taskId: 'task-1',
      taskTitle: 'Salon & Spa Services',
      workerEmail: 'kelvinwakaba46@gmail.com',
      mediaType: 'video',
      status: 'pending', // pending, approved, rejected
      pay: 35.0,
      notes: 'Chest mount recording 1080p 60fps',
      submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ],
  payouts: [],
};

// Load or initialize DB
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading DB, using default:', e);
  }
  saveDb(defaultDb);
  return defaultDb;
}

function saveDb(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving DB:', e);
  }
}

// CORS & Headers helper
function setHeaders(res, contentType = 'application/json') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', contentType);
}

// Request parser
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle preflight CORS
  if (method === 'OPTIONS') {
    setHeaders(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  const db = loadDb();

  // API ROUTES
  if (pathname.startsWith('/api/')) {
    setHeaders(res);

    // GET /api/health
    if (pathname === '/api/health' && method === 'GET') {
      res.statusCode = 200;
      res.end(JSON.stringify({ status: 'ok', server: 'KLKT Admin & Task API', time: new Date() }));
      return;
    }

    // GET /api/tasks - List all tasks
    if (pathname === '/api/tasks' && method === 'GET') {
      res.statusCode = 200;
      res.end(JSON.stringify(db.tasks));
      return;
    }

    // POST /api/tasks - Create new task (Admin)
    if (pathname === '/api/tasks' && method === 'POST') {
      const data = await parseBody(req);
      if (!data.title) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Task title is required' }));
        return;
      }
      const newTask = {
        id: 'task-' + Date.now(),
        title: data.title,
        category: data.category || 'video',
        requirement: data.requirement || 'RECORD ONLY 1 RECORDING PER TASK',
        pay: Number(data.pay) || 25.0,
        description: data.description || 'Follow standard data collection guidelines.',
        duration: data.duration || '15 mins',
        spots: Number(data.spots) || 10,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      db.tasks.unshift(newTask);
      saveDb(db);
      res.statusCode = 201;
      res.end(JSON.stringify({ message: 'Task created successfully', task: newTask }));
      return;
    }

    // DELETE /api/tasks/:id - Delete task
    if (pathname.startsWith('/api/tasks/') && method === 'DELETE') {
      const id = pathname.replace('/api/tasks/', '');
      db.tasks = db.tasks.filter((t) => t.id !== id);
      saveDb(db);
      res.statusCode = 200;
      res.end(JSON.stringify({ message: 'Task deleted' }));
      return;
    }

    // GET /api/user - Get user info & wallet stats
    if (pathname === '/api/user' && method === 'GET') {
      res.statusCode = 200;
      res.end(JSON.stringify(db.user));
      return;
    }

    // POST /api/user - Update user
    if (pathname === '/api/user' && method === 'POST') {
      const updates = await parseBody(req);
      Object.assign(db.user, updates);
      saveDb(db);
      res.statusCode = 200;
      res.end(JSON.stringify(db.user));
      return;
    }

    // GET /api/submissions - List submissions
    if (pathname === '/api/submissions' && method === 'GET') {
      res.statusCode = 200;
      res.end(JSON.stringify(db.submissions));
      return;
    }

    // POST /api/submissions - Submit completed task (from mobile app)
    if (pathname === '/api/submissions' && method === 'POST') {
      const data = await parseBody(req);
      const newSub = {
        id: 'sub-' + Date.now(),
        taskId: data.taskId || 'task-custom',
        taskTitle: data.taskTitle || 'Custom Upload',
        workerEmail: data.workerEmail || db.user.email,
        mediaType: data.mediaType || 'video',
        pay: Number(data.pay) || 30.0,
        notes: data.notes || '',
        status: 'pending',
        submittedAt: new Date().toISOString(),
      };
      db.submissions.unshift(newSub);
      db.user.submittedTasks += 1;
      db.user.totalUploads += 1;
      if (newSub.mediaType === 'video') db.user.videosCount += 1;
      else db.user.photosCount += 1;
      saveDb(db);
      res.statusCode = 201;
      res.end(JSON.stringify({ message: 'Task submitted for review', submission: newSub }));
      return;
    }

    // POST /api/submissions/:id/approve - Approve task (Credits Money to Worker!)
    if (pathname.match(/\/api\/submissions\/[^/]+\/approve/) && method === 'POST') {
      const id = pathname.split('/')[3];
      const sub = db.submissions.find((s) => s.id === id);
      if (!sub) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Submission not found' }));
        return;
      }
      if (sub.status !== 'approved') {
        sub.status = 'approved';
        db.user.balance += Number(sub.pay || 0);
        db.user.approvedTasks += 1;
        db.user.approvedHours += 1;
        saveDb(db);
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ message: 'Submission approved and reward credited to worker wallet!', submission: sub, newBalance: db.user.balance }));
      return;
    }

    // POST /api/submissions/:id/reject - Reject task
    if (pathname.match(/\/api\/submissions\/[^/]+\/reject/) && method === 'POST') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const sub = db.submissions.find((s) => s.id === id);
      if (!sub) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Submission not found' }));
        return;
      }
      sub.status = 'rejected';
      sub.rejectionReason = body.reason || 'Recording quality does not meet guidelines';
      saveDb(db);
      res.statusCode = 200;
      res.end(JSON.stringify({ message: 'Submission marked as rejected', submission: sub }));
      return;
    }

    // Unknown API
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
    return;
  }

  // STATIC WEB ADMIN DASHBOARD (Served at root / and /admin)
  const dashboardHtml = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(dashboardHtml)) {
    setHeaders(res, 'text/html; charset=utf-8');
    fs.createReadStream(dashboardHtml).pipe(res);
  } else {
    setHeaders(res, 'text/plain');
    res.statusCode = 200;
    res.end('KLKT Backend Running on port ' + PORT);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`   KLKT ADMIN CONTROL CENTER & API BACKEND IS RUNNING`);
  console.log(`======================================================`);
  console.log(`\n Access Admin Web Dashboard at: http://localhost:${PORT}`);
  console.log(` Mobile App API Endpoint at:     http://localhost:${PORT}/api`);
  console.log(` Database File:                 ${DB_FILE}`);
  console.log(`\n Press Ctrl+C to stop.\n`);
});
