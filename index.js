const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/file')

dotenv.config();
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors({origin: '*'}));
app.use(express.json());
app.use(authRoutes);
app.use(fileRoutes);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
