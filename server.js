require('dotenv').config(); // must come first if using env vars
console.log("Loaded SESSION_SECRET:", process.env.SESSION_SECRET);

const multer = require('multer');
const mkdirp = require('mkdirp'); // Helps create nested folders safely

const cors = require('cors');

const express = require('express');
const session = require('express-session'); // 👈 This needs to come BEFORE you use `session`
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const fs = require('fs');
const path = require('path');

const app = express();

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Not authenticated' });
}

app.use(session({
  
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'lax',   // allow cross-site cookies from Google auth
    secure: false       // must be false for localhost (true only over HTTPS)
  }
}));

// Ensure upload folder exists
mkdirp.sync(path.join(__dirname, 'uploads/proofs'));

app.get('/uploads/proofs/:filename', ensureAuthenticated, (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'proofs', req.params.filename);

  // Check if file exists
  if (fs.existsSync(filePath)) {
    // Force download
    res.download(filePath, req.params.filename);
  } else {
    res.status(404).send('File not found');
  }
});


// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads/proofs'));
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const cleanName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}_${cleanName}`);
  }
});

const proofUploader = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'text/plain'
    ];
  
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, PPTX, or TXT files are allowed'));
    }
  }
  
});

const proofMetaFile = path.join(__dirname, 'uploads', 'proofMetadata.json');

function saveProofMetadata(entry) {
  let metadata = [];
  if (fs.existsSync(proofMetaFile)) {
    const raw = fs.readFileSync(proofMetaFile, 'utf-8');
    metadata = JSON.parse(raw || '[]');
  }

  metadata.push(entry);
  fs.writeFileSync(proofMetaFile, JSON.stringify(metadata, null, 2));
}

app.use(cors({
  origin: 'http://localhost:3000', // your frontend origin
  credentials: true                // allow cookies
}));


app.use((req, res, next) => {
  console.log('🔥 Session middleware hit');
  next();
});

app.use(passport.initialize());
app.use((req, res, next) => {
  console.log('✅ Passport initialized');
  next();
});

app.use(passport.session());
app.use((req, res, next) => {
  console.log('🌀 Passport session middleware hit');
  next();
});




passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  const user = {
    name: profile.displayName,
    email: profile.emails?.[0]?.value || null,
    id: profile.id
  };
  return done(null, user);
}));

passport.serializeUser((user, done) => {
  console.log('👉 SERIALIZING USER:', user);
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  console.log('🔄 DESERIALIZING USER:', obj);
  done(null, obj);
});


const PORT = 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});


// Serve frontend build from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Load rules from file
const dataPath = path.join(__dirname, 'data/breRules.json');

app.get('/api/rules', (req, res) => {
  try {
    const json = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    if (!Array.isArray(json.ruleUnitDtoList)) {
      return res.status(400).json({ message: 'Invalid rule file format' });
    }
    res.json(json.ruleUnitDtoList); // ✅ Send full raw rules
  } catch (err) {
    console.error('❌ Failed to load rules:', err);
    res.status(500).json({ message: 'Error reading rules file' });
  }
});

app.post('/api/rules/:id', ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  const { newValue, newParam, newCategory, newDescription } = req.body;
  const json = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  let rule = json.ruleUnitDtoList.find(r => r.ruleId === id);

const isNewRule = !rule;
if (isNewRule) {
  rule = {
    ruleId: id,
    ruleCheckpointParameter: newParam || '',
    ruleTemplateGroupCategory: newCategory || '',
    ruleMetadata: { ruleDescription: newDescription || '' },
    ruleConfig: { value: newValue || '' }
  };
  json.ruleUnitDtoList.push(rule);
}

  // Write to ruleConfig.value if it exists, otherwise operandDefinition[1].value (only for old rules)
  if (!isNewRule) {
    //ruleConfig.value is already set in Creation block
    if (rule.ruleConfig && 'value' in rule.ruleConfig) {
      rule.ruleConfig.value = newValue;
    } else if (rule.operand?.operandDefinition?.[1]) {
      rule.operand.operandDefinition[1].value = newValue;
    } else {
      // Fallback: initialize ruleConfig if missing
      rule.ruleConfig = { value: newValue };
    }    
  }  

  // Update other editable fields if provided
if (newParam !== undefined) rule.ruleCheckpointParameter = newParam;
if (newCategory !== undefined) rule.ruleTemplateGroupCategory = newCategory;

  // Additional logic for threshold rule fields
  if (req.body.validation) {
    rule.validation = req.body.validation;
    if (!rule.ruleConfig) rule.ruleConfig = {};
    rule.ruleConfig.value = req.body.value ?? newValue;
  }

  if (req.body.newParam !== undefined) {
    rule.parameter = req.body.newParam;
  }

  if (req.body.newDescription !== undefined) {
    rule.ruleDescription = req.body.newDescription;
  }

if (newDescription !== undefined) {
  if (!rule.ruleMetadata) rule.ruleMetadata = {};
  rule.ruleMetadata.ruleDescription = newDescription;
}


  fs.writeFileSync(dataPath, JSON.stringify(json, null, 2));
  res.sendStatus(200);
});

app.delete('/api/rules/:id', ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  const json = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const index = json.ruleUnitDtoList.findIndex(r => r.ruleId === id);
  if (index === -1) return res.status(404).send('Rule not found');

  json.ruleUnitDtoList.splice(index, 1);

  fs.writeFileSync(dataPath, JSON.stringify(json, null, 2));
  res.sendStatus(200);
});

app.post('/api/proof', ensureAuthenticated, proofUploader.single('proofFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const uploadedBy = req.user?.name || 'Unknown';
  const email = req.user?.email || 'Unknown';
  const timestamp = new Date().toISOString();

  const metadataEntry = {
  filename: req.file.filename,
  uploadedBy,
  email,
  timestamp
  };

  saveProofMetadata(metadataEntry);

  console.log('📎 Proof file uploaded:', req.file.filename);
  console.log('📝 Metadata saved:', metadataEntry);

  res.json({
  message: 'File uploaded successfully',
  metadata: metadataEntry
  });

  
});


app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);


app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    req.login(req.user, (err) => {
      if (err) return next(err);
      console.log('✅ LOGGED IN USER:', req.user);
      res.redirect('/');
    });
  }
);

app.get('/auth/user', (req, res) => {
  console.log('📩 /auth/user called');
  if (req.isAuthenticated()) {
    console.log('✅ SESSION USER:', req.user);
    return res.json({
      name: req.user.name,
      email: req.user.email,
      id: req.user.id
    });
  } else {
    console.log('⛔ Not authenticated in /auth/user');
    return res.status(401).json({ message: 'Not logged in' });
  }
});

app.get('/api/proof/metadata', ensureAuthenticated, (req, res) => {
  try {
    const raw = fs.existsSync(proofMetaFile)
      ? fs.readFileSync(proofMetaFile, 'utf-8')
      : '[]';
    const metadata = JSON.parse(raw);
    res.json(metadata);
  } catch (err) {
    console.error('Error reading proof metadata:', err);
    res.status(500).json({ message: 'Failed to load metadata' });
  }
});

app.get('/download/proof/:filename', ensureAuthenticated, (req, res) => {
  const filePath = path.join(__dirname, 'uploads/proofs', req.params.filename);

  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.download(filePath); // force browser download
  } else {
    res.status(404).send('File not found');
  }
});

app.post('/api/proof/snapshot', ensureAuthenticated, (req, res) => {
  const { filename, rules } = req.body;
  if (!filename || !rules) {
    return res.status(400).json({ message: 'Missing filename or rules' });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const versionedName = `${filename}_${timestamp}.json`;
  const versionedPath = path.join(__dirname, 'uploads', 'proofs', versionedName);

  // ✅ Save versioned snapshot
  fs.writeFileSync(versionedPath, JSON.stringify(rules, null, 2));

  // ✅ ALSO save/update the base .json file
  const latestSnapshotPath = path.join(__dirname, 'uploads', 'proofs', `${filename}.json`);
  fs.writeFileSync(latestSnapshotPath, JSON.stringify(rules, null, 2));

  res.json({ message: 'Snapshot saved' });
});


// 2. 🔚 Catch-all LAST
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// 🔐 Protect rule actions

app.put('/api/rules/:id', ensureAuthenticated, (req, res) => {
  // logic for updating a rule
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});
