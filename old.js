

/* ─── Helper: 4‑digit OTP ───────────────── */
const genOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

/* ─── STEP‑1  LOGIN  (email + password) ----------------------------- */
app.post("/api/software-download-login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const col  = client.db("Zuppa").collection("softwareDownloads");
    const user = await col.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid Email" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)  return res.status(400).json({ message: "Invalid Password" });

    /* ① Generate + hash OTP */
    const otp        = genOtp();
    const otpHash    = await bcrypt.hash(otp, 10);
    const otpExpires = Date.now() + 5 * 60_000;   // 5 min

    await col.updateOne(
      { _id: user._id },
      { $set: { otpHash, otpExpires } }
    );

    /* ② Send e‑mail */
    await transporter.sendMail({
      from   : process.env.EMAIL,
      to     : email,
      subject: "Your Zuppa OTP Code",
      html   : `
        <h2 style="color:#ff6f00;">Your OTP Code</h2>
        <p>Enter the 4‑digit code below to complete login:</p>
        <h1 style="letter-spacing:6px;">${otp}</h1>
        <p>This code expires in 5 minutes.</p>`
    });
    console.log("✉️  OTP mailed to", email, "OTP:", otp);

    return res.status(200).json({ message: "OTP sent to your e‑mail", email });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

/* ────────────────────────────────────────── STEP‑2  VERIFY OTP                        */


   
app.post("/api/software-download-verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const col  = client.db("Zuppa").collection("softwareDownloads");
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
        $set  : { lastLogin: new Date() },
      }
    );

    res.status(200).json({
      message : "Login successful",
      zuppa   : token,
      _id     : user._id,
      username: user.username,
    });

  } catch (err) {
    console.error("OTP Verify Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});
