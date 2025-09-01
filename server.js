import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import Jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import nodemailer from "nodemailer";
import "dotenv/config";
import crypto from "crypto";
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

// -------------------------- AS 128 --------------------------

const AES_KEYS = {
  LOGIN: process.env.LOGIN_AES_KEY,
  OTP: process.env.OTP_AES_KEY,
};

const getValidKey = (key) => {
  const buf = Buffer.from(key, "utf8");
  if (buf.length === 16) return buf;
  if (buf.length < 16)
    return Buffer.concat([buf, Buffer.alloc(16 - buf.length)], 16);
  return buf.slice(0, 16);
};

const decryptAES = (base64, key) => {
  try {
    const raw = Buffer.from(base64, "base64");
    if (raw.length <= 16) {
      throw new Error(`Invalid encrypted data length: ${raw.length} bytes`);
    }
    const iv = raw.slice(0, 16);
    const encrypted = raw.slice(16);
    const validKey = getValidKey(key);
    const decipher = crypto.createDecipheriv("aes-128-cbc", validKey, iv);
    decipher.setAutoPadding(true);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.error("❌ Decrypt failed for input:", base64);
    throw err;
  }
};

const safeDecrypt = (input, key) => {
  try {
    if (!input || input.length < 24) {
      console.warn("⚠️ Plain text detected, skipping decryption:", input);
      return input;
    }
    return decryptAES(input, key);
  } catch (err) {
    console.error("❌ Decryption failed:", err);
    throw err;
  }
};

const upload = multer({ storage: storage });

//------------------------Nodemailer transporter setup--------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAILPASSWORD,
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
      to: "santhiya30032@gmail.com",

      subject: "Website New Contact Form Submission",
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
 <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 15px; background-color: #fff4d9;">
      
      <!-- Header with Logo -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
        <h2 style="color: orange; margin: 0; font-size: 20px;">Thank you for contacting ZUPPA <strong>${interestedIn}</strong>. </h2>
        <img 
          src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1735795527/zkvojccmuawxgh9eetf4.png" 
          alt="Zuppa Logo" 
          style="width:110px; height: 100px; object-fit: contain;" 
        />
      </div>

      <!-- Body Content -->
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thanks for contacting us for a <strong>Demo Booking</strong>.</p>
      <p>Our team will reach out to you shortly.</p>
      
      <br/>
      <p style="margin:0;">Best Regards,<br/><strong>Team Zuppa Geo Navigation</strong></p>
    </div>




  `,
    });

    res.status(201).json({ message: "Form submitted successfully." });
  } catch (err) {
    console.error("❌ /api/contact:", err);
    res.status(500).json({ error: "Server error, please try again later." });
  }
});

// ---------------- WEBSITE CONTACT PAGE   DEMO BOOKING ------------------
app.post("/demobooking", async (req, res) => {
  const {
    demoName,
    demoDesignation,
    demoCity,
    demoMobile,
    demoEmail,
    endurance,
    missionRange,
    constraints,
    features,
    droneType,
    demoQuantity,
    enquiryType,
    demoAtOEM,
    demoDate,
  } = req.body;

  try {
    // ✅ Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(demoEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // 1. Save to DB
    await client.db("Zuppa").collection("demoBookings").insertOne({
      demoName,
      demoDesignation,
      demoCity,
      demoMobile,
      demoEmail,
      endurance,
      missionRange,
      constraints,
      features,
      droneType,
      demoQuantity,
      enquiryType,
      demoAtOEM,
      demoDate,
      createdAt: new Date(),
    });

    // 2. Notify admin
    await transporter.sendMail({
      from: process.env.EMAIL,
      // to: "askme@zuppa.io",
      to: "santhiya30032@gmail.com",
      subject: "New Demo Booking Request",
      html: `
        <h2 style="color:#ff9307">New Demo Booking</h2>
        <ul style="font-size:15px;line-height:1.5">
          <li><strong>Name:</strong> ${demoName}</li>
          <li><strong>Designation:</strong> ${demoDesignation}</li>
          <li><strong>City:</strong> ${demoCity}</li>
          <li><strong>Phone:</strong> ${demoMobile}</li>
          <li><strong>Email:</strong> ${demoEmail}</li>
          <li><strong>Expected endurance:</strong> ${endurance}</li>
          <li><strong>MissionRange Type:</strong> ${missionRange}</li>
          <li><strong>Do you have any size or weight constraints for the drone?:</strong> ${constraints}</li>
         <li><strong>What specific features are you looking for in the drone?:</strong> ${features}</li>
          <li><strong>What type/category of drone is required:</strong> ${droneType}</li>
          <li><strong>Expected Quantity:</strong> ${demoQuantity}</li>
          <li><strong>Is this enquiry related to an:</strong> ${enquiryType}</li>
          <li><strong>Demo at OEM:</strong> ${demoAtOEM}</li>
          <li><strong>Date:</strong> ${demoDate || "Not provided"}</li>
        </ul>`,
    });

    // 3. Acknowledgment to user
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: demoEmail,
      subject: "Thanks for booking a demo with Zuppa",
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 15px; background-color: #fff4d9;">
      
      <!-- Header with Logo -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
        <h2 style="color: orange; margin: 0; font-size: 20px;">Thanks for Booking a Demo with Zuppa</h2>
        <img 
          src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1735795527/zkvojccmuawxgh9eetf4.png" 
          alt="Zuppa Logo" 
          style="width:110px; height: 100px; object-fit: contain;" 
        />
      </div>

      <!-- Body Content -->
      <p>Hi <strong>${demoName}</strong>,</p>
      <p>Thanks for contacting us for a <strong>Demo Booking</strong>.</p>
      <p>Our team will reach out to you shortly.</p>
      
      <br/>
      <p style="margin:0;">Best Regards,<br/><strong>Team Zuppa Geo Navigation</strong></p>
    </div>
  `,
    });

    res.status(201).json({ message: "Thanks for contacting" });
  } catch (err) {
    console.error("❌ /demobooking:", err);
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

    const userMailOptions = {
      from: process.env.EMAIL,
      to: emailid,
      subject: "Thank You for Contacting Drone Lab",
      html: `
        <h3>Dear ${username},</h3>
        <p>Thanks for contacting <strong>Zuppa Drone Lab</strong>.</p>
        <p>We’ve received your message and will respond shortly.</p>
        <p><strong>Our company profile is downloaded successfully.</strong></p>
        <p>Warm regards,<br/>Zuppa Geo Navigation</p>`,
    };
    await transporter.sendMail(userMailOptions);

    // ✅ Final response
    res.status(201).send({ message: "." });
  } catch (error) {
    console.error("Backend error:", error);
    res.status(500).send({ error: error.message });
  }
});

//------------------------------- website disha android Software Download API --------------------------------------------------------

app.post("/api/software-download", async (req, res) => {
  try {
    const username = decryptAES(req.body.username, AES_KEYS.LOGIN);
    const emailid = decryptAES(req.body.emailid, AES_KEYS.LOGIN);
    const phoneNumber = decryptAES(req.body.phoneNumber, AES_KEYS.LOGIN);
    const aadharNumber = decryptAES(req.body.aadharNumber, AES_KEYS.LOGIN);

    const db = client.db("Zuppa");
    const collection = db.collection("softwareDownloads");

    const existing = await collection.findOne({ email: emailid });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(phoneNumber, salt);

    await collection.insertOne({
      username,
      email: emailid,
      password: hashedPassword,
      aadharNumber,
      registerDate: new Date(),
    });

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
        <p>Hello <strong>${username}</strong>,</p>
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

//------------------------------- Check email availability for software download --------------------------------------------------------

app.post("/api/check-email", async (req, res) => {
  try {
    const email = decryptAES(req.body.email, AES_KEYS.LOGIN);
    const exists = await client
      .db("Zuppa")
      .collection("softwareDownloads")
      .findOne({ email });

    res.json({ available: !exists });
  } catch (err) {
    console.error("Error in check-email:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// -------------   WEBSITE after aadhar card send otp  ---------------------------------

const otpMap = new Map();
app.post("/api/send-otp", async (req, res) => {
  try {
    const email = decryptAES(req.body.email, AES_KEYS.OTP);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    otpMap.set(email, otp);
    console.log("OTP for", email, "is", otp);

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

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "OTP sent successfully to your email" });
  } catch (error) {
    console.error("OTP Send Error:", error);
    res
      .status(500)
      .json({ message: "Failed to send OTP", error: error.message });
  }
});

//-------------------------------after aadhar card  otp verification website software  Download API verify OTP --------------------------------------------------------

app.post("/api/verify-otp", async (req, res) => {
  try {
    const email = decryptAES(req.body.email, AES_KEYS.OTP);
    const otp = decryptAES(req.body.otp, AES_KEYS.OTP);
    const validOtp = otpMap.get(email);

    if (parseInt(otp) === validOtp) {
      otpMap.delete(email);
      res
        .status(200)
        .json({ verified: true, message: "OTP Verified Successfully" });
    } else {
      res.status(400).json({ verified: false, message: "Invalid OTP" });
    }
  } catch (err) {
    console.error("OTP Verification Error:", err);
    res
      .status(500)
      .json({ verified: false, message: "Server Error", error: err.message });
  }
});
//---------------------------------- website dronelab brochure request API --------------------------

app.post("/api/brochure", async (req, res) => {
  const { name, organization, phone, email, page = "" } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  const SHOP_BASE_URL = "https://shop.zuppa.io";

  const productPath = page.startsWith("/") ? page : `/${page}`;
  const productUrl = `${SHOP_BASE_URL}${productPath}`;

  const productName = productPath
    .split("/")
    .pop()
    .replace(/\(.*\)/g, "")
    .replace(/_/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  try {
    await client.db("Zuppa").collection("brochureRequests").insertOne({
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
      to: "askme@zuppa.io",
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
        <p>Best regards<br/> Zuppa Geo Navigation Team </p>
      `,
    });

    res
      .status(200)
      .json({ message: "Brochure request submitted successfully" });
  } catch (error) {
    console.error("❌ Error in /api/brochure:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});






//-------------------------------android gcs login Download API --------------------------------------------------------

const genOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

app.post("/api/software-download-login", async (req, res) => {
  const FIXED_OTP_MAP = {
    "softwaredeveloperzuppa@gmail.com": "4091",
  };
  try {
    const email = safeDecrypt(req.body.email, AES_KEYS.LOGIN);
    const password = safeDecrypt(req.body.password, AES_KEYS.LOGIN);

    const col = client.db("Zuppa").collection("softwareDownloads");
    const user = await col.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid Email" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid Password" });

    const otp =
      FIXED_OTP_MAP[email] ||
      Math.floor(1000 + Math.random() * 9000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpires = Date.now() + 5 * 60_000;

    await col.updateOne({ _id: user._id }, { $set: { otpHash, otpExpires } });

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Your Zuppa OTP Code",
      html: `
        <h2 style="color:#ff6f00;">Your OTP Code</h2>
        <p>Enter the 4-digit code below to complete login:</p>
        <h1 style="letter-spacing:6px;">${otp}</h1>
        <p>This code expires in 5 minutes.</p>
      `,
    });

    console.log("✉️  OTP mailed to", email, "OTP:", otp);
    return res.status(200).json({ message: "OTP sent to your e-mail", email });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

/* ──────────────────────────────────────────android gcs STEP‑2  VERIFY OTP     -------------------------------                   */

app.post("/api/software-download-verify-otp", async (req, res) => {
  try {
    const email = decryptAES(req.body.email, AES_KEYS.OTP);
    const otp = decryptAES(req.body.otp, AES_KEYS.OTP);

    const col = client.db("Zuppa").collection("softwareDownloads");
    const user = await col.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Please login first" });
    }

    // Check if OTP expired
    if (!user.otpHash || !user.otpExpires || Date.now() > user.otpExpires) {
      await col.updateOne(
        { _id: user._id },
        { $unset: { otpHash: "", otpExpires: "", failedOtpAttempts: "" } }
      );
      return res
        .status(400)
        .json({ message: "OTP expired. Please request a new one." });
    }

    // Check if user exceeded 3 attempts
    const failedAttempts = user.failedOtpAttempts || 0;
    if (failedAttempts >= 3) {
      await col.updateOne(
        { _id: user._id },
        { $unset: { otpHash: "", otpExpires: "", failedOtpAttempts: "" } }
      );
      return res
        .status(400)
        .json({ message: "Too many attempts. Please login again." });
    }

    // Compare OTP
    const ok = await bcrypt.compare(otp, user.otpHash);
    if (!ok) {
      await col.updateOne(
        { _id: user._id },
        { $inc: { failedOtpAttempts: 1 } }
      );
      const remaining = 2 - failedAttempts;
      if (remaining > 0) {
        return res
          .status(400)
          .json({
            message: `Invalid OTP. You have ${remaining} attempt(s) left.`,
          });
      } else {
        return res.status(400).json({ message: "Please login again." });
      }
    }

    // OTP is correct
    const token = Jwt.sign({ id: user._id }, process.env.SECRETKEY, {
      expiresIn: "90d",
    });

    await col.updateOne(
      { _id: user._id },
      {
        $unset: { otpHash: "", otpExpires: "", failedOtpAttempts: "" },
        $set: { lastLogin: new Date() },
      }
    );

    return res.status(200).json({
      message: "Login successful",
      zuppa: token,
      _id: user._id,
      username: user.username,
    });
  } catch (err) {
    console.error("OTP Verify Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});





// --------------------- 1) Forgot Password ---------------------
app.post("/api/software-download-forgot-password", async (req, res) => {
  try {
    const email = safeDecrypt(req.body.email, AES_KEYS.LOGIN);

    const col = client.db("Zuppa").collection("softwareDownloads");
    const user = await col.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email not found" });

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    const resetExpires = Date.now() + 15 * 60_000; // valid 15 mins

    // Save in DB
    await col.updateOne(
      { _id: user._id },
      { $set: { resetTokenHash, resetExpires } }
    );

    // Send reset link via email
    const resetLink = `${process.env.BASE_URL}/android_reset/?token=${resetToken}&email=${encodeURIComponent(
      email
    )}`;

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Reset your Zuppa Password",
      html: `
        <h2 style="color:#ff6f00;">Password Reset Request</h2>
        <p>Click the button below to reset your password:</p>
        <a href="${resetLink}" style="background:#ff6f00;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Reset Password</a>
        <p>This link will expire in 15 minutes.</p>
      `,
    });

    console.log("✉️  Password reset mail sent to", email);

    return res.status(200).json({
      message: "Password reset link sent to your e-mail",
    });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// --------------------- 2) Reset Password ---------------------
app.post("/api/software-download-reset-password", async (req, res) => {
  try {
    const email = safeDecrypt(req.body.email, AES_KEYS.LOGIN);
    const token = req.body.token; // plain token from link
    const newPassword = safeDecrypt(req.body.newPassword, AES_KEYS.LOGIN);

    const col = client.db("Zuppa").collection("softwareDownloads");
    const user = await col.findOne({ email });

    if (!user || !user.resetTokenHash) {
      return res.status(400).json({ message: "Invalid or expired reset request" });
    }

    // Check expiry
    if (Date.now() > user.resetExpires) {
      await col.updateOne(
        { _id: user._id },
        { $unset: { resetTokenHash: "", resetExpires: "" } }
      );
      return res.status(400).json({ message: "Reset link expired" });
    }

    // Compare token
    const ok = await bcrypt.compare(token, user.resetTokenHash);
    if (!ok) {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    // Update password
    const hashPass = await bcrypt.hash(newPassword, 10);
    await col.updateOne(
      { _id: user._id },
      {
        $set: { password: hashPass },
        $unset: { resetTokenHash: "", resetExpires: "" },
      }
    );

    return res.status(200).json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});















app.listen(PORT, () => {
  console.log("Listening successfully on port", PORT);
});
