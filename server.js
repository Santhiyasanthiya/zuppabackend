import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import Jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import nodemailer from "nodemailer";
import "dotenv/config";
import fs from "fs";

import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT;
const URL = process.env.DB;

const client = new MongoClient(URL);
await client.connect();
console.log("Connected to MongoDB");

app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

//------------------------Nodemailer transporter setup--------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL, // Your email
    pass: process.env.EMAILPASSWORD, // Your email password or app password
  },
});

//---------------------------------------- Authentication middleware--------------------------
const authentication = (req, res, next) => {
  try {
    const getToken = req.header("token");
    Jwt.verify(getToken, process.env.SECRETKEY);
    next();
  } catch (error) {
    res.send({ message: error.message });
  }
};

//---------------------- ---------------- Server Running... ---------------------------------------------------------------

app.post("/", (req, res) => {
  res.send("Server Running...");
});

app.get("/", (req, res) => {
  res.send("Zuppa Server Running...");
});

//------------------------------------------ CareerForm and uploadFile also ---------------------------------------------------------------------------

app.post("/careerform", upload.single("resume"), async (req, res) => {
  const {
    name,
    email,
    contactNumber,
    education,
    portfolio,
    location,
    passOut,
  } = req.body;
  const resumePath = req.file.path;
  try {
    const CareerPost = await client
      .db("Zuppa")
      .collection("Collection")
      .insertOne({
        resumePath,
        name,
        email,
        contactNumber,
        education,
        portfolio,
        location,
        passOut,
      });
    console.log(CareerPost);

    const mailOptions = {
      from: process.env.EMAIL,
      to: "hr-executive@zuppa.io",

      subject: "New Career Form Submission",
      html: `<div>
      A new career form has been submitted by ${name}.
       <p>contact Number : ${contactNumber}</p>
       <p>Education: ${education}</p>
       <p>PortfolioLink : ${portfolio}</p>
       <p>Location: ${location}</p>
          <p>Passout:${passOut}</p> </div>`,
      attachments: [
        {
          filename: req.file.originalname,
          path: resumePath,
        },
      ],
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).send({ message: "Error sending email" });
      } else {
        console.log("Email sent: " + info.response);
        return res
          .status(200)
          .json({ message: "Form submitted successfully and email sent" });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error submitting form" });
  }
});

//------------------------------------------Website contact ---------------------------------------------------------------------------


app.post("/api/contact", async (req, res) => {
  const {
    name,
    organization,
    designation,
    city,
    mobile,
    email,
    interestedIn,
    knowMoreAbout,
    procurementPlan,
    quantity,
    demoOption,
    location,
  } = req.body;

  try {
    /* 1.  Store in MongoDB */
    await client.db("Zuppa").collection("contact").insertOne({
      name,
      organization,
      designation,
      city,
      mobile,
      email,
      interestedIn,
      knowMoreAbout,
      procurementPlan,
      quantity,
      demoOption,
      location,
      createdAt: new Date(),
    });

    /* 2.  Notify admin */
    await transporter.sendMail({
      from: process.env.EMAIL,
      // to: "askme@zuppa.io",
       to: "bestforevermvi@gmail.com",
      subject: "website New Contact Form Submission",
      html: `
        <h2 style="color:#ff9307">New Inquiry – ${interestedIn}</h2>
        <ul style="font-size:15px;line-height:1.5">
          <li><strong>Name:</strong> ${name}</li>
          <li><strong>Email:</strong> <a href="mailto:${email}">${email}</a></li>
          <li><strong>Phone:</strong> ${mobile}</li>
          <li><strong>Organization:</strong> ${organization}</li>
          <li><strong>Designation:</strong> ${designation}</li>
          <li><strong>City:</strong> ${city}</li>
          <li><strong>Interested In:</strong> ${interestedIn}</li>
          <li><strong>Know More About:</strong> ${knowMoreAbout}</li>
          <li><strong>Procurement Plan:</strong> ${procurementPlan}</li>
          <li><strong>Quantity:</strong> ${quantity}</li>
          <li><strong>Demo Option:</strong> ${demoOption}</li>
          <li><strong>Location:</strong> ${location}</li>
        </ul>`,
    });

    /* 3.  Acknowledgement to user */
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Thank you for contacting Zuppa",
      html: `
        <p>Hi ${name},</p>
        <p>Thank you for contacting ZUPPA <strong>${interestedIn}</strong>.  </p>
       <p>Our team will get in touch within 4 working hours to understand your requirements and guide you on the best-fit solution.</p>
        <p style="margin:0">Regards,<br/>Team Zuppa Geo Navigation</p>`,
    });

    res.status(201).json({ message: "Form submitted successfully." });
  } catch (err) {
    console.error("❌ /api/contact:", err);
    res.status(500).json({ error: "Server error, please try again later." });
  }
});
/* ─────────────────────────────────────────────────────────────────────── */


//------------------------- webpage  Drone labs contact ----------------------------------------------------------------------------------------

app.post("/api/dronelabcontact", async (req, res) => {
  const { username, emailid, phoneNumber, state } = req.body;
  console.log(username, emailid, phoneNumber, state);

  try {
    // 1. Save to DB
    await client
      .db("Zuppa")
      .collection("droneLab")
      .insertOne({ username, emailid, phoneNumber, state });

    // 2. Admin Email
    const adminMailOptions = {
      from: process.env.EMAIL,
      to: "sales@zuppa.io",
      subject: "shop.zuppa.io drone labs New Contact Form Submission",
      html: `
        <div>
          <h2 style="color:rgb(255,94,0);"> Drone Lab Inquiry </h2>
          <ul>
            <h4><strong>  Name:</strong> ${username}</h4>
            <br/>
            <h4><strong>  Phone:</strong> ${phoneNumber}</h4>
             <br/>
            <h4><strong>  Email:</strong> ${emailid}</h4>
             <br/>
            <h4><strong> State:</strong> ${state}</h4>
          </ul>
        </div>`,
    };
    await transporter.sendMail(adminMailOptions);

    // 3. User Acknowledgment + PDF attachment
    const pdfPath = path.join(__dirname, "public", "zuppa.pdf");

    if (!fs.existsSync(pdfPath)) {
      console.error("📄 PDF not found at:", pdfPath);
      throw new Error("PDF file missing");
    }

    const userMailOptions = {
      from: process.env.EMAIL,
      to: emailid,
      subject: "Thank You for Contacting Drone Lab",
      html: `
        <h3>Dear ${username},</h3>
        <p>Thanks for contacting <strong>Zuppa Drone Lab</strong>.</p>
        <p>We’ve received your message and will respond shortly.</p>
        <p><strong>Our company profile is attached below as a PDF.</strong></p>
        <p>Warm regards,<br/>Zuppa Geo Navigation</p>`,
      attachments: [
        {
          filename: "zuppa.pdf",
          path: pdfPath,
          contentType: "application/pdf",
        },
      ],
    };
    await transporter.sendMail(userMailOptions);

    // ✅ Final response
    res
      .status(201)
      .send({ message: "Emails sent to admin & client with PDF." });
  } catch (error) {
    console.error("Backend error:", error);
    res.status(500).send({ error: error.message });
  }
});

//------------------------------- website disha android Software Download API --------------------------------------------------------

app.post("/api/software-download", async (req, res) => {
  const { username, emailid, phoneNumber, aadharNumber } = req.body;

  try {
    const db = client.db("Zuppa");
    const collection = db.collection("softwareDownloads");

    // 1⃣  Duplicate‑email check
    const existing = await collection.findOne({ email: emailid });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // 2⃣  Hash the phone as password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(phoneNumber, salt);

    // 3⃣  Save user
    await collection.insertOne({
      username,
      email: emailid,
      password: hashedPassword,
      aadharNumber,
      registerDate: new Date(),
    });

    // 4⃣  Prepare emails  (⟵ moved up)
    const adminMail = {
      from: process.env.EMAIL,
      to: "noreplyzuppa@gmail.com",
      subject: "New Software Download Request",
      html: `
        <h3 style="color:orange;">New Download Registration</h3>
        <p><strong>Name:</strong> ${username}</p>
        <p><strong>Email:</strong> ${emailid}</p>
        <p><strong>Phone:</strong> ${phoneNumber}</p>
        <p><strong>Aadhaar:</strong> ${aadharNumber}</p>
      `,
    };

    const userMail = {
      from: process.env.EMAIL,
      to: emailid,
      subject: "Your Software Download from Zuppa",
      html: `
        <div style="text-align:center">
          <img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412389/t267ln5xi0a1mue0v9sn.gif"
               width="110" height="100" alt="Zuppa Logo"/>
        </div>
        <h2 style="color:orange;">Thank You for Registering!</h2>
        <p>Hello <strong>${username || "User"}</strong>,</p>
        <p>You can download the software here:</p>
        <p><a href="https://drive.google.com/file/d/1JVzYVPGmNM3np9-KOgF01fI4GVa974UK/view?usp=sharing" target="_blank">
             Download Software
           </a></p>
        <div style="border:2px dashed #ffa500;padding:15px;border-radius:10px;background:#fff8e1;">
          <h3 style="color:#ff6f00;">📲  Your Android Registration Details</h3>
          <p><strong>Username:</strong> ${emailid}</p>
          <p><strong>Password:</strong> ${phoneNumber}</p>
        </div>
        <p style="margin-top:20px;">Need help?  askme@zuppa.io</p>
        <p><strong>Team Zuppa Geo Navigation</strong></p>
      `,
    };

    // 5⃣  Send emails once
    await transporter.sendMail(adminMail);
    await transporter.sendMail(userMail);

    res
      .status(200)
      .json({ message: "Registration and email sent successfully." });
  } catch (err) {
    console.error("Error in software‑download API:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.post("/api/check-email", async (req, res) => {
  const { email } = req.body;
  const exists = await client
    .db("Zuppa")
    .collection("softwareDownloads")
    .findOne({ email });
  res.json({ available: !exists });
});

const otpMap = new Map();

app.post("/api/send-otp", async (req, res) => {
  const { email } = req.body;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return res.status(400).json({ message: "Invalid email" });

  // Generate 4-digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000);
  otpMap.set(email, otp); // store in memory
  console.log("OTP for", email, "is", otp);

  // Send email
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Your Zuppa OTP Code",
    html: `<div style="font-family: Arial; padding: 20px;">
      <h2 style="color: darkorange;">Your OTP Code</h2>
      <p>Use the 4-digit OTP below to verify your download:</p>
      <h1 style="letter-spacing: 5px;">${otp}</h1>
      <p>This OTP is valid for 5 minutes.</p>
      <p>- Team Zuppa Geo Navigation</p>
    </div>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "OTP sent successfully to your email" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to send OTP", error: error.message });
  }
});
// ..................after aadhar card send otp verification........................................................
app.post("/api/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const validOtp = otpMap.get(email);

  if (parseInt(otp) === validOtp) {
    otpMap.delete(email); // clear OTP after successful use
    res
      .status(200)
      .json({ verified: true, message: "OTP Verified Successfully" });
  } else {
    res.status(400).json({ verified: false, message: "Invalid OTP" });
  }
});

//-------------------------------AndroidApp login Download API --------------------------------------------------------

const genOtp = () => Math.floor(1000 + Math.random() * 9000).toString();
// Users who must always get the same OTP


app.post("/api/software-download-login", async (req, res) => {
  const { email, password } = req.body;

const FIXED_OTP_MAP = {
  "softwaredeveloperzuppa@gmail.com": "4091",

};
  try {
    const col = client.db("Zuppa").collection("softwareDownloads");
    const user = await col.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid Email" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid Password" });

    /* ① Generate + hash OTP */
const otp =
   FIXED_OTP_MAP[email]            // 👉 special user?
     ? FIXED_OTP_MAP[email]        // yes → fixed code
     : genOtp();                   // others → random 4‑digit
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpires = Date.now() + 5 * 60_000; // 5 min.js

    await col.updateOne({ _id: user._id }, { $set: { otpHash, otpExpires } });

    /* ② Send e‑mail */
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Your Zuppa OTP Code",
      html: `
        <h2 style="color:#ff6f00;">Your OTP Code</h2>
        <p>Enter the 4‑digit code below to complete login:</p>
        <h1 style="letter-spacing:6px;">${otp}</h1>
        <p>This code expires in 5 minutes.</p>`,
    });
    console.log("✉️  OTP mailed to", email, "OTP:", otp);

    return res.status(200).json({ message: "OTP sent to your e‑mail", email });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

/* ────────────────────────────────────────── STEP‑2  VERIFY OTP     -------------------------------                   */

app.post("/api/software-download-verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const col = client.db("Zuppa").collection("softwareDownloads");
    const user = await col.findOne({ email });
    if (!user) return res.status(400).json({ message: "Please login first" });

    if (!user.otpHash || Date.now() > user.otpExpires)
      return res.status(400).json({ message: "OTP expired" });

    const ok = await bcrypt.compare(otp, user.otpHash);
    if (!ok) return res.status(400).json({ message: "Invalid OTP" });

    /* ① Success → issue JWT */
    const token = Jwt.sign({ id: user._id }, process.env.SECRETKEY, {
      expiresIn: "90d",
    });

    /* ② Clean up + update lastLogin */
    await col.updateOne(
      { _id: user._id },
      {
        $unset: { otpHash: "", otpExpires: "" },
        $set: { lastLogin: new Date() },
      }
    );

    res.status(200).json({
      message: "Login successful",
      zuppa: token,
      _id: user._id,
      username: user.username,
    });
  } catch (err) {
    console.error("OTP Verify Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});


//------------------ Website Brochure Form Submission --------------------------

// server.js  (or wherever your routes live)
app.post("/api/brochure", async (req, res) => {
  const { name, organization, phone, email, page = "" } = req.body;

  // ✅ Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  /* ------------------------------------------------------------------ */
  /* 1.  Build product URL and human‑friendly title                     */
  /* ------------------------------------------------------------------ */
  const SHOP_BASE_URL = "https://shop.zuppa.io";
  // page might arrive as "/ajeet_eagle" or "ajeet_eagle" – handle both
  const productPath = page.startsWith("/") ? page : `/${page}`;
  const productUrl  = `${SHOP_BASE_URL}${productPath}`;

  // Convert "ajeet_eagle" → "Ajeet Eagle", "mini_hawk_(day)&(day&night)" → "Mini Hawk"
  const productName = productPath
    .split("/")               // keep last segment
    .pop()
    .replace(/\(.*\)/g, "")   // strip anything in ( )
    .replace(/_/g, " ")       // underscores → spaces
    .replace(/\s{2,}/g, " ")  // collapse double spaces
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase()); // title‑case

  /* ------------------------------------------------------------------ */
  /* 2.  Store in MongoDB                                               */
  /* ------------------------------------------------------------------ */
  try {
    await client
      .db("Zuppa")
      .collection("brochureRequests")
      .insertOne({
        name,
        organization,
        phone,
        email,
        productPath,
        productUrl,
        productName,
        submittedAt: new Date(),
      });

    /* ----------------------------------------------------------------
       3.  Internal notification (to you)                              */

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: "santhiya30032@gmail.com",
      subject: `${productUrl} Brochure Request`,
      html: `
        <h2 style="color:orange;">Brochure Request Details</h2>
        <p><strong>Product URL:</strong> <a href="${productUrl}">${productUrl}</a></p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Organization:</strong> ${organization}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Email:</strong> ${email}</p>`,
    });

    /* ----------------------------------------------------------------
       4.  Confirmation to customer                                    */
  
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: `Thanks for requesting the ${productName} brochure`,
      html: `
        <h3>Dear ${name},</h3>
        <p>Thank you for your interest in the <strong>${productName}</strong>.</p>
        <p>You can view the product here: <a href="${productUrl}">${productUrl}</a>.</p>
        <p>Our team will connect with you shortly. Meanwhile, feel free to visit
           <a href="https://shop.zuppa.io">zuppa.io</a> for more info.</p>
        <p>Warm regards,<br/>Team Zuppa</p>
      `,
    });

    res .status(200)
 .json({ message: "Brochure request submitted successfully" });
  } catch (error) {
    console.error("❌ Error in /api/brochure:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});





















app.listen(PORT, () => {
  console.log("Listening successfully on port", PORT);
});
