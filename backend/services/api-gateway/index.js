const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());

const authService = process.env.AUTH_SERVICE_URL || "http://localhost:4001";
const productService = process.env.PRODUCT_SERVICE_URL || "http://localhost:4002";
const cartService = process.env.CART_SERVICE_URL || "http://localhost:4003";

// Auth Routes
app.use("/login", createProxyMiddleware({ target: authService, changeOrigin: true }));
app.use("/signup", createProxyMiddleware({ target: authService, changeOrigin: true }));

// Product Routes
app.use("/allproducts", createProxyMiddleware({ target: productService, changeOrigin: true }));
app.use("/newcollections", createProxyMiddleware({ target: productService, changeOrigin: true }));
app.use("/popularinwomen", createProxyMiddleware({ target: productService, changeOrigin: true }));
app.use("/relatedproducts", createProxyMiddleware({ target: productService, changeOrigin: true }));
app.use("/addproduct", createProxyMiddleware({ target: productService, changeOrigin: true }));
app.use("/removeproduct", createProxyMiddleware({ target: productService, changeOrigin: true }));
app.use("/upload", createProxyMiddleware({ target: productService, changeOrigin: true }));
app.use("/images", createProxyMiddleware({ target: productService, changeOrigin: true }));

// Cart Routes
app.use("/addtocart", createProxyMiddleware({ target: cartService, changeOrigin: true }));
app.use("/removefromcart", createProxyMiddleware({ target: cartService, changeOrigin: true }));
app.use("/getcart", createProxyMiddleware({ target: cartService, changeOrigin: true }));

app.get("/", (req, res) => {
  res.send("API Gateway Running - Microservices Architecture Active");
});

app.listen(port, () => {
  console.log(`API Gateway listening on port ${port}`);
});
