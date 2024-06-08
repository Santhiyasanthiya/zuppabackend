

import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import Jwt from "jsonwebtoken";
import bcrypt from 'bcrypt';
import multer from 'multer';
import nodemailer from "nodemailer";
import 'dotenv/config';
import https from 'https';
import fs from 'fs';

    
var key = fs.readFileSync('/etc/letsencrypt/live/shop.zuppa.io/privkey.pem');
var cert = fs.readFileSync('/etc/letsencrypt/live/shop.zuppa.io/cert.pem');
var options = {
  key: key,
  cert: cert
};


const app = express();
const PORT = process.env.PORT;
const URL = process.env.DB;

const client = new MongoClient(URL);
await client.connect();
console.log("Connected to MongoDB");

app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

//------------------------Nodemailer transporter setup--------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL, // Your email
    pass: process.env.EMAILPASSWORD // Your email password or app password
  }
});

//---------------------- Authentication middleware--------------------------
const authentication = (req, res, next) => {
  try {
    const getToken = req.header("token");
    Jwt.verify(getToken, process.env.SECRETKEY);
    next();
  } catch (error) {
    res.send({ message: error.message });
  }
};

app.post("/", (req, res) => {
  res.send("Server Running...");
});

app.post("/signup", async function(req, res) {
  const { username, email, password } = req.body;
  const finduser = await client.db("Zuppa").collection("private").findOne({ email: email });

  if (finduser) {
    res.status(400).send({ message: "This user Already exists" });
  } else {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const postSignin = await client.db("Zuppa").collection("private").insertOne({ username: username, email: email, password: hashedPassword });
    res.status(200).send({ postSignin, message: "Successfully Register" });
  }
});

app.post('/login', async function(req, res) {
  const { email, password } = req.body;
  const userFind = await client.db("Zuppa").collection("private").findOne({ email: email });

  if (userFind) {
    const strongPassword = userFind.password;
    const passwordCheck = await bcrypt.compare(password, strongPassword);
    if (passwordCheck) {
      const token = Jwt.sign({ id: userFind._id }, process.env.SECRETKEY);
      res.status(200).send({ zuppa: token, message: "Successfully Login", _id: userFind._id, username: userFind.username });
      console.log("Logged IN");
    } else {
      res.status(400).send({ message: "Invalid Password" });
    }
  } else {
    res.status(400).send({ message: "Invalid Email" });
  }
});

app.get("/getprofile", async function(req, res) {
  const getMethod = await client.db("Zuppa").collection("private").find({}).toArray();
  console.log("Successfully", getMethod);
  res.status(200).send(getMethod);
});

app.get("/profileget/:singleId", async function(req, res) {
  const { singleId } = req.params;
  const getProfile = await client.db("Zuppa").collection("private").findOne({ _id: new ObjectId(singleId) });
  console.log("Successfully", getProfile);
  res.status(200).send(getProfile);
});

app.post('/careerform', upload.single('resume'), async (req, res) => {
  const { name, email, contactNumber, education, portfolio, location, passOut } = req.body;
  const resumePath = req.file.path;
  const CareerPost = await client.db("Zuppa").collection("Collection").insertOne({resumePath,name, email, contactNumber, education, portfolio, location, passOut});
  res.status(200).send(CareerPost).json({ message: 'Form submitted successfully' });
});



app.post('/forgotpassword', async (req, res) => {
  try {
    const { email } = req.body;
    const userFind = await client.db("Zuppa").collection("private").findOne({ email });

    if (userFind) {
      const token = Jwt.sign({ id: userFind._id }, process.env.SECRETKEY, { expiresIn: '10m' });
      const url = `${process.env.BASE_URL}/resetpassword/${userFind._id}/${token}`;

      const details = {
        from: process.env.EMAIL,
        to: userFind.email,
        subject: 'Password Reset',
        html: `<div style="border:3px solid blue; padding: 20px;">
                 <span>Password Reset Link: </span>
                 <a href="${url}">Click here</a>
                 <div>
                   <h4>Note:</h4>
                   <ul>
                     <li>This link is only valid for 10 minutes</li>
                   </ul>
                 </div>
               </div>`,
      };

      await transporter.sendMail(details);
      res.json({ statusCode: 200, message: 'Password reset link sent to your email' });
    } else {
      res.json({ statusCode: 401, message: 'Invalid email address' });
    }
  } catch (error) {
    console.error(error);
    res.json({ statusCode: 500, message: 'Internal Server Error', error });
  }
});

// Reset Password Route
app.post('/resetpassword/:id/:token', async (req, res) => {
  try {
    const { id, token, password } = req.body;

    // Verify JWT Token
    try {
      const decoded = Jwt.verify(token, process.env.SECRETKEY);
      if (decoded.id !== id) {
        return res.json({ statusCode: 401, message: 'Invalid token' });
      }
    } catch (err) {
      return res.json({ statusCode: 401, message: 'Invalid or expired token' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const userUpdate = await client.db("Zuppa").collection("private").updateOne({ _id: new ObjectId(id) }, { $set: { password: hashed } });

    res.json({ statusCode: 200, message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.json({ statusCode: 500, message: 'Internal Server Error', error });
  }
});

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message} = req.body;
  try {
    const newContact = await client.db("Zuppa").collection("contact").insertOne({ name, email, subject, message });

    // Send email to admin
    const adminMailOptions = {
      from: process.env.EMAIL,
      to:'askme@zuppa.io',
      subject: 'New Contact Form Submission',
      html: `<p>You have received a new message from  (${email}).</p>
      <p><strong>Subject:</strong>${name}</p>
             <p><strong>Subject:</strong> ${subject}</p>
             <p><strong>Message:</strong> ${message}</p>`
    };

    await transporter.sendMail(adminMailOptions);

    // Send acknowledgment email to user from no-reply address
    const userMailOptions = {
      from:'noreplyzuppa@gmail.com',
      // from: process.env.EMAIL,
      to: email,
      subject: 'Thank You for Contacting Us',
      html: `<p>Dear ${name},</p>
             <p>Thank you for reaching out to us. We have received your message and will get back to you shortly.</p>
             <p>Best regards,</p>
             <p>Zuppa Geo Navigation 🛸</p>
             <p>9952081655</p>
             <h5>Address : </h5>
             <p>Polyhose Tower No.86, West Wing, 4th Floor Anna Salai, Guindy, Chennai, Tamil Nadu-600032</p>
             <p>Email :askme@zuppa.io</p>
             `
    };

    await transporter.sendMail(userMailOptions);

    res.status(201).send({ message: 'Form submitted and acknowledgment email sent successfully' });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});


// app.listen(PORT, () => {
//   console.log("Listening successfully on port", PORT);
// });


var server = https.createServer(options, app);
server.listen(PORT, () => {
  console.log("server starting on port : " + PORT)
});
