require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Serverless DB Connection
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
};

// Schema
const Users = mongoose.models.Users || mongoose.model("Users", new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true },
  password: { type: String },
  cartData: { type: Object },
  date: { type: Date, default: Date.now() },
}));

app.post('/login', async (req, res) => {
  await connectDB();
  let success = false;
  let user = await Users.findOne({ email: req.body.email });
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = { user: { id: user.id } };
      success = true;
      const token = jwt.sign(data, process.env.JWT_SECRET || 'secret_ecom');
      res.json({ success, token });
    } else {
      return res.status(400).json({ success: success, errors: "please try with correct email/password" });
    }
  } else {
    return res.status(400).json({ success: success, errors: "please try with correct email/password" });
  }
});

app.post('/signup', async (req, res) => {
  await connectDB();
  let success = false;
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res.status(400).json({ success: success, errors: "existing user found with this email" });
  }
  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }
  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    cartData: cart,
  });
  await user.save();
  const data = { user: { id: user.id } };
  const token = jwt.sign(data, process.env.JWT_SECRET || 'secret_ecom');
  success = true;
  res.json({ success, token });
});

module.exports = app;
