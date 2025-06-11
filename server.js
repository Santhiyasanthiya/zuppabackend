import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import Jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import nodemailer from "nodemailer";
import "dotenv/config";
import Razorpay from "razorpay";
import axios from "axios";
import https from "https";
import fs from "fs";






const app = express();
const PORT = process.env.PORT;
const URL = process.env.DB;

const client = new MongoClient(URL);
await client.connect();
console.log("Connected to MongoDB");

app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));

// const razorpayInstance = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });








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
  res.send("Server Running...")
  ;
});

app.get("/", (req, res) => {
  res.send("Zuppa Server Running...")
  ;
});


//---------------------- ---------------- Server Running... ---------------------------------------------------------------

// app.post("/signup", async function (req, res) {
//   const { username, email, password } = req.body;
//   try {
//     await client.connect();
//     console.log("Connected to the database");

//     const finduser = await client
//       .db("Zuppa")
//       .collection("private")
//       .findOne({ email: email });
//     console.log("User lookup complete:", finduser);

//     if (finduser) {
//       return res.status(400).send({ message: "This user already exists" });
//     } else {
//       const salt = await bcrypt.genSalt(10);
//       const hashedPassword = await bcrypt.hash(password, salt);
//       console.log("Password hashed successfully");

//       let postSignin;
//       try {
//         postSignin = await client.db("Zuppa").collection("private").insertOne({
//           username: username,
//           email: email,
//           password: hashedPassword,
//         });
//         console.log("User creation result:", postSignin);
//       } catch (insertError) {
//         console.error("Insertion error:", insertError);
//         return res
//           .status(500)
//           .json({
//             statusCode: 500,
//             message: "Error during registration",
//             error: insertError.message,
//           });
//       }

//       if (postSignin.acknowledged) {
//         const url = `https://shop.zuppa.io/Login`;
//         const details = {
//           from: process.env.EMAIL,
//           to: email,
//           subject: "Thank You for Registering with [Zuppa Geo Navigation]",
//           html: `
//             <div style="font-family: Arial, sans-serif; max-width: 450px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; box-shadow: 10px 0px 30px 40px rgba(0, 0, 0, 0.2); border-radius: 15px; background-color: #fff4d9;">
//               <div style="display: flex; justify-content: space-between; align-items: center;">
//                 <h2 style="color: orange; margin: 0;">Thank You for Registering!</h2>
//                 <img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412389/t267ln5xi0a1mue0v9sn.gif" height="100px" width="110px" alt="Zuppa Logo">
//               </div>
//               <p>Dear :<span style="font-size:15px; margin-left: 10px;">${username}</span>,</p>
//               <p>Thank you for registering with us! We're excited to have you here.</p>
//               <p>If you need any assistance, don't hesitate to contact us:</p>
//               <ul style="list-style-type: none; padding: 0;">
//                 <li style="display: flex; align-items: center;"><img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412385/fjurbddsghxmmuyynylt.webp" alt="Email" style="width: 16px; margin-right: 8px;">Customer Support: <strong><a href="mailto:support@zuppa.io">support@zuppa.io</a></strong></li>
//                 <br/>
//                 <li style="display: flex; align-items: center;"><img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412386/t4ca5vpzjwhjol4vg0mj.png" alt="Phone" style="width: 16px; margin-right: 8px;">Phone Number: <strong><a href="tel:+91 7305950506">7305950506</a></strong></li>
//                 <br/><br/>
//                 <li style="display: flex; align-items: center;"><img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412385/fjurbddsghxmmuyynylt.webp" alt="Email" style="width: 16px; margin-right: 8px;">Sales Support: <strong><a href="mailto:askme@zuppa.io">askme@zuppa.io</a>  </strong></li>
//                 <br/>
//                 <li style="display: flex; align-items: center;"><img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412386/t4ca5vpzjwhjol4vg0mj.png" alt="Phone" style="width: 16px; margin-right: 8px;">Phone Number: <strong><a href="tel:+91 9952081655">9952081655</a></strong></li>
//               </ul>
//               <p>Best regards,<br>[Team Zuppa Geo Navigation]</p>
//               <a href="${url}" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">Login Here</a>
//             </div>
// `,
//         };

//         console.log("Sending email...");
//         try {
//           await transporter.sendMail(details);
//           console.log("Email sent successfully");
//           return res.json({
//             statusCode: 200,
//             message:
//               "Registered successfully. Check your email for further details.",
//           });
//         } catch (emailError) {
//           console.error("Email sending error:", emailError);
//           return res
//             .status(500)
//             .json({
//               statusCode: 500,
//               message: "Error sending email",
//               error: emailError.message,
//             });
//         }
//       } else {
//         console.error(
//           "Error during registration: insertion acknowledged but not confirmed"
//         );
//         return res
//           .status(500)
//           .json({ statusCode: 500, message: "Error during registration" });
//       }
//     }
//   } catch (error) {
//     console.error("Error occurred:", error);
//     return res
//       .status(500)
//       .json({
//         statusCode: 500,
//         message: "Internal Server Error",
//         error: error.message,
//       });
//   } finally {
//     console.log("Closing the database connection...");
//     await client.close();
//     console.log("Database connection closed");
//   }
// });

//------------------------------------------ Login  ---------------------------------------------------------------------------

// app.post("/login", async function (req, res) {
//   const { email, password } = req.body;
//   const userFind = await client
//     .db("Zuppa")
//     .collection("private")
//     .findOne({ email: email });

//   if (userFind) {
//     const strongPassword = userFind.password;
//     const passwordCheck = await bcrypt.compare(password, strongPassword);
//     if (passwordCheck) {
//       const token = await Jwt.sign({ id: userFind._id }, process.env.SECRETKEY);
//       res
//         .status(200)
//         .send({
//           zuppa: token,
//           message: "Successfully Login",
//           _id: userFind._id,
//           username: userFind.username,
//         });
//       console.log("Logged IN");
//     } else {
//       res.status(400).send({ message: "Invalid Password" });
//     }
//   } else {
//     res.status(400).send({ message: "Invalid Email" });
//   }
// });

//------------------------------------------ GetProfile ---------------------------------------------------------------------------

// app.get("/getprofile", async function (req, res) {
//   const getMethod = await client
//     .db("Zuppa")
//     .collection("private")
//     .find({})
//     .toArray();
//   console.log("Successfully", getMethod);
//   res.status(200).send(getMethod);
// });

//------------------------------------------ GetProfileSingleId ---------------------------------------------------------------------------

// app.get("/profileget/:singleId", async function (req, res) {
//   const { singleId } = req.params;
//   const getProfile = await client
//     .db("Zuppa")
//     .collection("private")
//     .findOne({ _id: new ObjectId(singleId) });
//   console.log("Successfully", getProfile);
//   res.status(200).send(getProfile);
// });

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
      // to: 'hr-executive@zuppa.io',
      to: "santhiya30032@gmail.com",
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

//------------------------------------------ Forgot Password ---------------------------------------------------------------------------

// app.post("/forgotpassword", async (req, res) => {
//   try {
//     const { email } = req.body;
//     const userFind = await client
//       .db("Zuppa")
//       .collection("private")
//       .findOne({ email });

//     if (userFind) {
//       const token = Jwt.sign({ id: userFind._id }, process.env.SECRETKEY, {
//         expiresIn: "5m",
//       });
//       const url = `${process.env.BASE_URL}/resetpassword/${userFind._id}/${token}`;

//       const details = {
//         from: process.env.EMAIL,
//         to: userFind.email,
//         subject: "Password Reset",
//         html: `<div style="border:3px solid blue; padding: 20px;">
//                  <span>Password Reset Link: </span>
//                  <a href="${url}">Click here</a>
//                  <div>
//                    <h4>Note:</h4>
//                    <ul>
//                      <li>This link is only valid for 10 minutes</li>
//                    </ul>
//                  </div>
//                </div>`,
//       };

//       await transporter.sendMail(details);
//       res.json({
//         statusCode: 200,
//         message: "Password reset link sent to your email",
//       });
//     } else {
//       res.json({ statusCode: 401, message: "Invalid email address" });
//     }
//   } catch (error) {
//     console.error(error);
//     res.json({ statusCode: 500, message: "Internal Server Error", error });
//   }
// });

//----------------------------------- Reset Password Route ------------------------------------------
// app.post("/resetpassword/:id/:token", async (req, res) => {
//   try {
//     const { id, token, password } = req.body;

//     // Verify JWT Token
//     try {
//       const decoded = Jwt.verify(token, process.env.SECRETKEY);
//       if (decoded.id !== id) {
//         return res.json({ statusCode: 401, message: "Invalid token" });
//       }
//     } catch (err) {
//       return res.json({ statusCode: 401, message: "Invalid or expired token" });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashed = await bcrypt.hash(password, salt);

//     const userUpdate = await client
//       .db("Zuppa")
//       .collection("private")
//       .updateOne({ _id: new ObjectId(id) }, { $set: { password: hashed } });
//     console.log(userUpdate);
//     res.json({ statusCode: 200, message: "Password reset successfully" });
//   } catch (error) {
//     console.error(error);
//     res.json({ statusCode: 500, message: "Internal Server Error", error });
//   }
// });

//------------------------------------------ contact ---------------------------------------------------------------------------

app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message, phone } = req.body;  // Added phone to the request body
  
  try {
    const newContact = await client
      .db("Zuppa")
      .collection("contact")
      .insertOne({ name, email, subject, message, phone });  // Store phone number in the database

    // Send email to admin
    const adminMailOptions = {
      from: process.env.EMAIL,
      to: "askme@zuppa.io",
      subject: "New Contact Form Submission",
      html: `
      <div style="max-width: 600px; margin: 0 auto; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1); padding: 20px; border-radius: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2 style="color: orange; margin: 0;">New Contact Form Submission</h2>
                <img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412389/t267ln5xi0a1mue0v9sn.gif" height="100px" width="110px" alt="Zuppa Logo">
        </div> 

        <ul style="list-style-type: none; padding: 0;">
                <br/>
                <li style="display: flex; align-items: center;"> 
                  <p>You have received a new message from <img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412385/fjurbddsghxmmuyynylt.webp" alt="Email" style="width: 16px; margin-right: 8px;">
                    <strong><a href="mailto:${email}">${email}</a></strong>
                  </p>
                </li>
                <br/>
                <li style="display: flex; align-items: center;"> <p><strong>Subject:</strong> ${subject}</p></li>
                <br/>
                <li style="display: flex; align-items: center;"><p><strong>Name:</strong> ${name}</p></li>
                <br/>
              <li style="display: flex; align-items: center;"> 
              <p> <strong>Phone Number:</strong> ${phone} </p>
              </li>
                <br/>
                <li style="display: flex; align-items: center;"> <p><strong>Message:</strong> ${message}</p></li>
                <br/>
        </ul>
      </div>
      `,
    };

    await transporter.sendMail(adminMailOptions);

    // Send acknowledgment email to user from no-reply address
    const userMailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Thank You for Contacting Us",
      html: `
      <div style="max-width: 600px; margin: 0 auto; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1); padding: 20px; border-radius: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2 style="color: orange; margin: 0;">Thank You for Contacting Us</h2>
                <img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412389/t267ln5xi0a1mue0v9sn.gif" height="100px" width="110px" alt="Zuppa Logo">
        </div>
        <h4>Dear ${name},</h4>
        <p>Thank you for reaching out to us.</p>
        <p>We have received your message and will get back to you shortly.</p>
        <ul style="list-style-type: none; padding: 0;">
                <br/>
                <li style="display: flex; align-items: center;">
                  <img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412385/fjurbddsghxmmuyynylt.webp" alt="Email" style="width: 16px; margin-right: 8px;">Sales Support: <strong><a href="mailto:askme@zuppa.io">askme@zuppa.io</a>  </strong>
                </li>
                <br/>
                <li style="display: flex; align-items: center;">
                  <img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412386/t4ca5vpzjwhjol4vg0mj.png" alt="Phone" style="width: 16px; margin-right: 8px;">Phone Number: <strong><a href="tel:+91 9952081655">9952081655</a></strong>
                </li>
                <br/>
        </ul>
        <p>Best regards,</p>
        <h3 style="color: darkorange;">Zuppa Geo Navigation</h3>
        <p><strong>Address:</strong></p>
        <p>Polyhose Tower No.86, West Wing</p>
        <p>4th Floor Anna Salai, Guindy</p>
        <p>Chennai, Tamil Nadu-600032</p> 
      </div>
      `,
    };

    await transporter.sendMail(userMailOptions);

    res.status(201).send({
      message: "Form submitted and acknowledgment email sent successfully",
    });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});


//------------------------- Drone labs contact ----------------------------------------------------------------------------------------

app.post("/api/dronelabcontact", async (req, res) => {
  const { username, emailid, phoneNumber } = req.body;
  console.log(username, emailid, phoneNumber);

  try {
    const newContact = await client
      .db("Zuppa")
      .collection("droneLab")
      .insertOne({ username, emailid, phoneNumber });

    // Send email to admin
    const adminMailOptions = {
      from: process.env.EMAIL,
      to: "askme@zuppa.io",
      cc: "sivakumar@zuppa.io",
      subject: "New Contact Form Submission",
      html: `
        <div style="max-width: 600px; margin: 0 auto; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1); padding: 20px; border-radius: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 style="color: orange; margin: 0;">Drone Lab Inquiry</h2>
        <img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412389/t267ln5xi0a1mue0v9sn.gif" height="100px" width="110px" alt="Zuppa Logo">
        </div>

          <ul style="list-style-type: none; padding: 0;">
                <br/>
                <li style="display: flex; align-items: center;"> <p>You have received a new message from <img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412385/fjurbddsghxmmuyynylt.webp" alt="Email" style="width: 16px; margin-right: 8px;"><strong><a href="mailto:${emailid}">${emailid}</a>  </strong> </p></li>
                <br/>
                <li style="display: flex; align-items: center;"><p><strong>Name:</strong> ${username}</p></li>
                <br/>
                <li style="display: flex; align-items: center;"><p><strong>Phone Number:</strong> <a href="tel:${phoneNumber}">${phoneNumber}</a></p></li>
                <br/>
          </ul>
        </div>`,
    };

    await transporter.sendMail(adminMailOptions);

    // Send acknowledgment email to user
    const userMailOptions = {
      from: process.env.EMAIL,
      to: emailid,

      subject: "Thank You for Contacting Drone lab",
      html: `
        <div style="max-width: 600px; margin: 0 auto; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1); padding: 20px; border-radius: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
              <h2 style="color: orange; margin: 0;">Thank You for Contacting Drone lab</h2>
              <img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412389/t267ln5xi0a1mue0v9sn.gif" height="100px" width="110px" alt="Zuppa Logo">
              </div>
          <h4>Dear ${username},</h4>
          <p>Thank you for reaching out to us. We have received your message and will respond to you shortly.</p>
          <p>Best regards,</p>
          <h3 style="color: darkorange;">Zuppa Geo Navigation</h3>
          <ul style="list-style-type: none; padding: 0;">
                <br/>
                <li style="display: flex; align-items: center;"><img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412385/fjurbddsghxmmuyynylt.webp" alt="Email" style="width: 16px; margin-right: 8px;">Sales Support: <strong><a href="mailto:askme@zuppa.io">askme@zuppa.io</a>  </strong></li>
                <br/>
                <li style="display: flex; align-items: center;"><img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412386/t4ca5vpzjwhjol4vg0mj.png" alt="Phone" style="width: 16px; margin-right: 8px;">Phone Number: <strong><a href="tel:+91 9952081655">9952081655</a></strong></li>
                <br/>
              </ul>
          <p><strong>Address:</strong></p>
          <p>Polyhose Tower No.86, West Wing</p>
          <p>4th Floor Anna Salai, Guindy</p>
          <p>Chennai, Tamil Nadu-600032</p>
          
        </div>
      `,
    };

    await transporter.sendMail(userMailOptions);

    res
      .status(201)
      .send({
        message: "Form submitted and acknowledgment email sent successfully",
      });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

//------------------------------- Route to create a Razorpay order--------------------------------------------------------
// app.post("/createOrder", async (req, res) => {
//   const { amount } = req.body;

//   const options = {
//     amount: amount, // Amount in the smallest currency unit
//     currency: "INR",
//     receipt: `receipt_order_${new Date().getTime()}`,
//   };

//   try {
//     const order = await razorpayInstance.orders.create(options);
//     res.json(order);
//   } catch (error) {
//     console.error("Error creating order:", error);
//     res
//       .status(500)
//       .json({ message: "Error creating order", error: error.message });
//   }
// });


// app.post("/savePayment", async (req, res) => {
//   const { userId, paymentId, orderId, signature, amount, currency, status, products, gst, cartTotal } = req.body;

//   try {
//     const userFind = await client
//       .db("Zuppa")
//       .collection("private")
//       .findOne({ _id: new ObjectId(userId) });

//     if (!userFind) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     const paymentData = {
//       userId,
//       username: userFind.username,
//       email: userFind.email,
//       phoneNumber: userFind.phoneNumber,
//       gstin: userFind.gstin,
//       shippingAddress: userFind.shippingAddress,
//       billingAddress: userFind.billingAddress,
//       paymentId,
//       orderId,
//       signature,
//       amount,
//       gst,
//       cartTotal,
//       currency,
//       status,
//       products, // Store multiple products in the database
//       date: new Date(),
//     };

//     const result = await client.db("Zuppa").collection("payments").insertOne(paymentData);

//     if (result.acknowledged) {
//       // Prepare product details HTML
//       const productDetailsHtml = products.map((product, index) => `
//       <tr key={index}>
//                     <td style="border: 1px solid #dddddd; padding: 8px; text-align: left; font-size: 14px; word-wrap: break-word;">${index+1}</td>
//                     <td style="border: 1px solid #dddddd; padding: 8px; text-align: left; font-size: 14px; word-wrap: break-word;"><p>${product.productName}</p> <p>${product.productUsage}</p></td>
//                     <td style="border: 1px solid #dddddd; padding: 8px; text-align: left; font-size: 14px;">${product.quantity}</td>
//                     <td style="border: 1px solid #dddddd; padding: 8px; text-align: left; font-size: 14px;">₹${product.eachTotalprice}</td>
//                 </tr>
//       `).join("");

//       const totalGST = products.reduce((acc, product) => acc + product.gst, 0);
//       const totalPrice = products.reduce((acc, product) => acc + product.price * product.quantity, 0);

//       // Email options for admin
//       const adminMailOptions = {
//         from: process.env.EMAIL,
//         // to: "askme@zuppa.io",
//         to: "nareshbabuk21@gmail.com",
//         subject: "New Payment Received",
//         html: `
//           <div>
//             <h2 style="color: orange; text-align: center;">Payment Notification</h2>
//             <h4>Customer Details</h4>
//             <p><strong>Name:</strong> ${userFind.username}</p>
//             <p><strong>Email:</strong> ${userFind.email}</p>
//             <p><strong>Phone Number:</strong> ${userFind.phoneNumber}</p>
//             <p><strong>GSTIN:</strong> ${userFind.gstin || "N/A"}</p>
//             <p><strong>Shipping Address:</strong> ${userFind.shippingAddress}</p>
//             <p><strong>Billing Address:</strong> ${userFind.billingAddress}</p>
//             <h4>Product Details</h4>
//             <table style="width: 100%; border-collapse: collapse;">
//               <thead>
//                 <tr>
//                   <th style="border: 1px solid #ddd; padding: 8px;">Product</th>
//                   <th style="border: 1px solid #ddd; padding: 8px;">Quantity</th>
//                   <th style="border: 1px solid #ddd; padding: 8px;">Price</th>
                 
//                 </tr>
//               </thead>
//               <tbody>
//                 ${productDetailsHtml}
//               </tbody>
//             </table>
//             <h4>GST: ₹${gst}</h4>
//             <h4>Total Price: ₹${amount}</h4>
//           </div>`,
//       };

//       await transporter.sendMail(adminMailOptions);

//       // Email options for user
//       const userMailOptions = {
//         from: process.env.EMAIL,
//         to: userFind.email,
//         subject: "Thank You for Your Payment",
//         html: `
//           <div>
//             <h2 style="color: orange; text-align: center;">Thank You for Your Payment</h2>
//             <h4>Dear ${userFind.username},</h4>
//             <p>Thank you for your payment of ₹${amount} on ${new Date().toLocaleDateString()}. Below are your payment details:</p>
//             <h4>Product Details</h4>


//                <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; display:flex; background-color:gray; max-width:100%; justify-content:center; ">
//     <div style="width: 100%; max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #dddddd; padding: 20px;">
        
//         <div style="display:flex; max-width:100%; justify-content:center;  align-items: center"> 
//             <img style="display: block;" src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412389/t267ln5xi0a1mue0v9sn.gif" height="100px"  width="110px" alt="Zuppa Logo">
//             <h4 style="color: #001445;"> Zuppa Geo Navigation </h4>
//            </div>
//         <div style="background-color: #001445; color: #ffffff; padding: 20px; text-align: left;">
//             <h4 style="color: #f27b13;">Your order has been shipped</h4>
//         </div>
//         <div style="padding: 20px;">
//             <p>Hi there. Your recent order on <a href="https://shop.zuppa.io/">shop.zuppa.io</a>. Your order details are shown below for your reference:</p>
//             <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
//                 <tr>
//                     <th style="border: 1px solid #dddddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-size: 14px;">Sl.no</th>
//                     <th style="border: 1px solid #dddddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-size: 14px;">Product</th>
//                     <th style="border: 1px solid #dddddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-size: 14px;">Quantity</th>
//                     <th style="border: 1px solid #dddddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-size: 14px;">Price</th>
//                 </tr>

//                 <tbody>
//                 ${productDetailsHtml}
//                 <tr>
//                     <td colspan="3" style="border: 1px solid #dddddd; padding: 8px; text-align: left; font-size: 14px;"><strong>Subtotal :</strong></td>
//                     <td style="border: 1px solid #dddddd; padding: 8px; text-align: left; font-size: 14px;">₹${cartTotal}</td>
//                 </tr>
//                 <tr>
//                     <td colspan="3" style="border: 1px solid #dddddd; padding: 8px; text-align: left; font-size: 14px;"><strong>GST 18 % :</strong></td>
//                     <td style="border: 1px solid #dddddd; padding: 8px; text-align: left; font-size: 14px;">₹${gst}</td>
//                 </tr>
//                 <tr>
//                     <td colspan="3" style="border: 1px solid #dddddd; padding: 8px; text-align: left; font-size: 14px;"><strong>Total :</strong></td>
//                     <td style="border: 1px solid #dddddd; padding: 8px; text-align: left; font-size: 14px;">₹${amount}</td>
//                 </tr>
//             </tbody>
//             </table>
//             <div style="display: flex; flex-wrap: wrap; justify-content: space-between;">
//                 <div style="width: 48%; margin-bottom: 20px;">
//                     <h4>Billing address</h4>
//                     <div style="margin: 0px;  border: 1px solid #dddddd; padding: 10px;">
//                         <p>Zuppa Geo Navigation Technologies Pvt Ltd<br>
//                             Venkatesh Sai<br>
//                             Flat 3A, Shubham, T45 A/B, 7th avenue, Besant Nagar, Chennai-90<br>
//                             Tamil Nadu<br>
//                             600042004<br>
//                             <a href="mailto:aeronutri904@gmail.com" style="color: #1a83d4; text-decoration: none; word-wrap: break-word;">aeronutri904@gmail.com</a></p>
//                     </div>
//                      </div>
//                 <div style="width: 48%; margin-bottom: 20px;">
//                     <h4>Shipping address</h4>
//                     <div style="margin: 0px;  border: 1px solid #dddddd; padding: 10px;">
//                         <p>Zuppa Geo Navigation Technologies Pvt Ltd<br>
//                             Venkatesh Sai<br>
//                             Flat 3A, Shubham, T45 A/B, 7th avenue, Besant Nagar, Chennai-90<br>
//                             Tamil Nadu<br>
//                             600042004<br>
//                             <a href="mailto:aeronutri904@gmail.com" style="color: #1a83d4; text-decoration: none; word-wrap: break-word;">aeronutri904@gmail.com</a></p>
//                     </div>
//                 </div>
//             </div>
//         </div>
//         <div style="text-align: center; padding: 20px; font-size: 12px; color: #777777;">
//             <p>Thanks for shopping with us.</p>
//             <p>For more details and any query, <a href="https://shop.zuppa.io/Contact" style="color: #1a83d4; text-decoration: none;">Get Customer Support.</a></p>
//         </div>
//     </div>

// </div>
//             <p>Best regards,</p>
//             <h3 style="color: darkorange;">Zuppa Geo Navigation</h3>
//           </div>`,
//       };

//       await transporter.sendMail(userMailOptions);

//       res.status(200).json({ message: "Payment details saved and emails sent successfully" });
//     } else {
//       res.status(500).json({ error: "Failed to save payment details" });
//     }
//   } catch (error) {
//     console.error("Error saving payment details:", error);
//     res.status(500).json({ error: "Error saving payment details" });
//   }
// });


// -----------------------------Tracking Delivery order ------------------------------------------
   // app.get("/api/tracking-info", (req, res) => {
//   res.json(trackingInfo);
// });


//****------------------------------------ CHATBOAT  ------------------------------------------------------ */

app.post('/api/chatbot', async (req, res) => {
  const { username, emailid, phoneNumber } = req.body;

  // Check if all fields are provided
  if (!username || !emailid || !phoneNumber) {
    return res.status(400).json({ message: 'Please provide all required fields: username, emailid, and phone number.' });
  }

  try {
    // Connect to MongoDB
    await client.connect();
    const database = client.db('Zuppa');  // Access the 'Zuppa' database
    const collection = database.collection('chatboatcontact');  // Access the 'chatboatcontact' collection

    // Insert the user information into the collection
    await collection.insertOne({ username, emailid, phoneNumber });

    // Respond with a success message
    res.status(200).json({ message: 'User information saved successfully!' });
  } catch (error) {
    console.error('Error saving user info:', error);
    res.status(500).json({ message: 'Error storing user information.' });
  } finally {
    // Close the MongoDB connection
    await client.close();
  }
});


//-------------------------------android Software Download API --------------------------------------------------------



app.post("/api/software-download", async (req, res) => {
  const { username, emailid, phoneNumber, aadharNumber } = req.body;

  try {
    const db = client.db("Zuppa");
    const collection = db.collection("softwareDownloads");

    // Hash the phone number as password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(phoneNumber, salt);

    // Save to DB
  await collection.insertOne({
  username,
  email: emailid,
  password: hashedPassword,
  aadharNumber,
  registerDate: new Date(),  // This stores registration date and time
});

    // Email to Admin and User (unchanged logic below)
    const adminMail = {
      from: process.env.EMAIL,
      to: "noreplyzuppa@gmail.com",
      subject: "New Software Download Request",
      html: `
        <div>
          <h3 style="color: orange;">New Download Registration</h3>
          <h4><strong> Zuppa Disha app Downloaded </strong></h4>
          <p><strong>Name:</strong> ${username}</p>
          <p><strong>Email:</strong> ${emailid}</p>
          <p><strong>Phone:</strong> ${phoneNumber}</p>
          <p><strong>Aadhar:</strong> ${aadharNumber}</p>
        </div>
      `,
    };

    const userMail = {
      from: process.env.EMAIL,
      to: emailid,
      subject: "Your Software Download from Zuppa",
      html: `
        <div style="display: flex; justify-content:center; align-items: center;">
          <img src="https://res.cloudinary.com/dmv2tjzo7/image/upload/v1724412389/t267ln5xi0a1mue0v9sn.gif" height="100px" width="110px" alt="Zuppa Logo">
        </div> 
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: orange;">Thank You for Registering!</h2>
          <p>Hello <strong>${username || 'User'}</strong>,</p>
          <p>Thank you for your interest. You can download your software using the link below:</p>
          <p><strong>Download Link:</strong><br/>
            <a href="https://drive.google.com/file/d/1JVzYVPGmNM3np9-KOgF01fI4GVa974UK/view?usp=sharing" target="_blank">
              Download Software
            </a>
          </p>
          <div style="border: 2px dashed #ffa500; padding: 15px; margin-top: 20px; border-radius: 10px; background-color: #fff8e1;">
            <h3 style="color: #ff6f00;">📲 Your Android Registration Details</h3>
            <p><strong>Username:</strong> ${emailid}</p>
            <p><strong>Password:</strong> ${phoneNumber}</p>
          </div>
          <p style="margin-top: 20px;">If you need help, contact <strong>askme@zuppa.io</strong></p>
          <p>Best regards,</p>
          <h4 style="color: darkorange;">Team Zuppa Geo Navigation</h4>
        </div>
      `,
    };

    await transporter.sendMail(adminMail);
    await transporter.sendMail(userMail);

    res.status(200).json({ message: "Registration and email sent successfully." });
  } catch (error) {
    console.error("Error in software download API:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});



//-------------------------------android login Download API --------------------------------------------------------


app.post("/api/software-download-login", async function (req, res) {
  const { email, password } = req.body;

  try {
    const db = client.db("Zuppa");
    const collection = db.collection("softwareDownloads");

    // Find user by email
    const userFind = await collection.findOne({ email });

    if (userFind) {
      // Compare hashed password
      const passwordCheck = await bcrypt.compare(password, userFind.password);
      if (passwordCheck) {
        // Generate JWT token
        const token = await Jwt.sign(
          { id: userFind._id },
          process.env.SECRETKEY
        );

        // Save current login timestamp
        const loginTime = new Date();
        await collection.updateOne(
          { _id: userFind._id },
          { $set: { lastLogin: loginTime } }
        );

        // Send response
        res.status(200).send({
          zuppa: token,
          message: "Successfully Login",
          _id: userFind._id,
          username: userFind.username,
          loginTime: loginTime.toLocaleString(), // optional
        });

        console.log(`✅ ${userFind.username} logged in at ${loginTime.toLocaleString()}`);
      } else {
        res.status(400).send({ message: "Invalid Password" });
      }
    } else {
      res.status(400).send({ message: "Invalid Email" });
    }
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).send({ message: "Server Error", error: err.message });
  }
});


// ====================== OTP SEND AND VERIFY Email ===========================================================

const otpMap = new Map(); 

app.post("/api/send-otp", async (req, res) => {
  const { email } = req.body;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ message: "Invalid email" });

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
    </div>`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "OTP sent successfully to your email" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
});

app.post("/api/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const validOtp = otpMap.get(email);

  if (parseInt(otp) === validOtp) {
    otpMap.delete(email); // clear OTP after successful use
    res.status(200).json({ verified: true, message: "OTP Verified Successfully" });
  } else {
    res.status(400).json({ verified: false, message: "Invalid OTP" });
  }
});





app.listen(PORT, () => {
  console.log("Listening successfully on port", PORT);
});
