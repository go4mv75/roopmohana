import {openStore,initialOwner,passwordHash,id} from './store.mjs';
const p=process.env.OWNER_SETUP_PASSWORD;
if(!p||p.length<14)throw new Error('Set OWNER_SETUP_PASSWORD to a unique password of at least 14 characters for this one-time command.');
const db=openStore(process.env.DATABASE_PATH||'./data/store.sqlite');
if(db.prepare('SELECT id FROM users WHERE email=?').get(initialOwner))throw new Error('Owner account already exists. Use password reset.');
db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id(),initialOwner,'Roopmohana Owner',passwordHash(p),1,Date.now());
console.log('Owner account created. Remove OWNER_SETUP_PASSWORD from the environment.');
