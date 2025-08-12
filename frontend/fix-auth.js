const bcrypt = require('bcryptjs');

const password = 'MasterAdmin123!';
const saltRounds = 12;

const hashPassword = async () => {
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('🔐 Hashed Password:', hash);
};

hashPassword();
