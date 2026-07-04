require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { Redis } = require("@upstash/redis");

const app = express();
app.use(express.json());
app.use(cors());

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
};

let redisClient = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (e) {
  console.log("Upstash Redis not configured yet.");
}

const Product = mongoose.models.Product || mongoose.model("Product", new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  new_price: { type: Number },
  old_price: { type: Number },
  date: { type: Date, default: Date.now },
  avilable: { type: Boolean, default: true },
}));

const cache = (key) => async (req, res, next) => {
  if (!redisClient) return next();
  try {
    const data = await redisClient.get(key);
    if (data) {
      console.log(`Cache Hit: ${key}`);
      return res.json(typeof data === 'string' ? JSON.parse(data) : data);
    }
    console.log(`Cache Miss: ${key}`);
    next();
  } catch (err) {
    next();
  }
};

app.get("/allproducts", cache('allproducts'), async (req, res) => {
  await connectDB();
  let products = await Product.find({});
  if (redisClient) await redisClient.setex('allproducts', 3600, JSON.stringify(products));
  res.send(products);
});

app.get("/newcollections", cache('newcollections'), async (req, res) => {
  await connectDB();
  let products = await Product.find({});
  let arr = products.slice(0).slice(-8);
  if (redisClient) await redisClient.setex('newcollections', 3600, JSON.stringify(arr));
  res.send(arr);
});

app.get("/popularinwomen", cache('popularinwomen'), async (req, res) => {
  await connectDB();
  let products = await Product.find({ category: "women" });
  let arr = products.splice(0, 4);
  if (redisClient) await redisClient.setex('popularinwomen', 3600, JSON.stringify(arr));
  res.send(arr);
});

app.post("/relatedproducts", async (req, res) => {
  await connectDB();
  const {category} = req.body;
  const products = await Product.find({ category });
  const arr = products.slice(0, 4);
  res.send(arr);
});

app.post("/addproduct", async (req, res) => {
  await connectDB();
  let products = await Product.find({});
  let id = products.length > 0 ? products.slice(-1)[0].id + 1 : 1;
  const product = new Product({
    id: id,
    name: req.body.name,
    description: req.body.description,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
  });
  await product.save();
  if (redisClient) await redisClient.del('allproducts', 'newcollections', 'popularinwomen');
  res.json({ success: true, name: req.body.name })
});

app.post("/removeproduct", async (req, res) => {
  await connectDB();
  await Product.findOneAndDelete({ id: req.body.id });
  if (redisClient) await redisClient.del('allproducts', 'newcollections', 'popularinwomen');
  res.json({ success: true, name: req.body.name })
});

const storage = multer.diskStorage({
  destination: '/tmp',
  filename: (req, file, cb) => {
    return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
  }
})
const upload = multer({ storage: storage })
app.post("/upload", upload.single('product'), (req, res) => {
  res.json({
    success: 1,
    image_url: `/images/${req.file.filename}`
  })
})
app.use('/images', express.static('/tmp'));

module.exports = app;
