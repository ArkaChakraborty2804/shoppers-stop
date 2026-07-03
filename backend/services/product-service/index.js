require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const redis = require("redis");

const app = express();
const port = process.env.PORT || 4002;

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://shreyasharmavr:shreyasharmavr18@cluster0.be78j07.mongodb.net/e-commerce");

// Redis Client Setup
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().catch(console.error);

// Schema for creating Product
const Product = mongoose.model("Product", {
  id: { type: Number, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  new_price: { type: Number },
  old_price: { type: Number },
  date: { type: Date, default: Date.now },
  avilable: { type: Boolean, default: true },
});

// Image Storage Engine
const storage = multer.diskStorage({
  destination: './upload/images',
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
app.use('/images', express.static('upload/images'));

// Middleware for Caching
const cache = (key) => async (req, res, next) => {
  try {
    const data = await redisClient.get(key);
    if (data !== null) {
      console.log(`Cache Hit: ${key}`);
      return res.json(JSON.parse(data));
    }
    console.log(`Cache Miss: ${key}`);
    next();
  } catch (err) {
    next();
  }
};

app.get("/allproducts", cache('allproducts'), async (req, res) => {
  let products = await Product.find({});
  await redisClient.setEx('allproducts', 3600, JSON.stringify(products));
  res.send(products);
});

app.get("/newcollections", cache('newcollections'), async (req, res) => {
  let products = await Product.find({});
  let arr = products.slice(0).slice(-8);
  await redisClient.setEx('newcollections', 3600, JSON.stringify(arr));
  res.send(arr);
});

app.get("/popularinwomen", cache('popularinwomen'), async (req, res) => {
  let products = await Product.find({ category: "women" });
  let arr = products.splice(0, 4);
  await redisClient.setEx('popularinwomen', 3600, JSON.stringify(arr));
  res.send(arr);
});

app.post("/relatedproducts", async (req, res) => {
  const {category} = req.body;
  const products = await Product.find({ category });
  const arr = products.slice(0, 4);
  res.send(arr);
});

// Admin product endpoints
app.post("/addproduct", async (req, res) => {
  let products = await Product.find({});
  let id;
  if (products.length > 0) {
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id = last_product.id + 1;
  }
  else { id = 1; }
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
  // Clear cache
  await redisClient.del(['allproducts', 'newcollections', 'popularinwomen']);
  res.json({ success: true, name: req.body.name })
});

app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  // Clear cache
  await redisClient.del(['allproducts', 'newcollections', 'popularinwomen']);
  res.json({ success: true, name: req.body.name })
});

app.listen(port, () => {
  console.log(`Product Service listening on port ${port}`);
});
