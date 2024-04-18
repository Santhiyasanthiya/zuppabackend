
import express from "express";
import cors from "cors"
import { MongoClient, ObjectId} from "mongodb";
import  Jwt  from "jsonwebtoken";
import bcrypt from 'bcrypt';
import multer from 'multer'
import 'dotenv/config'


const app = express();
const PORT = process.env.PORT;

const URL =process.env.DB;


const client = new MongoClient(URL)

await client.connect();
console.log("connected mongodb");
app.use(express.json())
app.use(cors({
  origin:"*",
  credentials:true
}))

const storage = multer.diskStorage({
destination:function(req, file,cb){
  return cb(null,"./public/images")
},
filename: function (req,file,cb){
return cb(null, `${Date.now()}_${file.originalname}`)
}
})


const authentication = (req,res,next)=> 
{

try {
  const getToken = req.header("token")
  Jwt.verify(getToken,"zuppa2525")
  next()
} catch (error) {
  res.send({message:error.message})
}
}


app.post("/",(req,res)=>{
  res.send("Server Running...")
})






app.post("/signup", async function(req,res){
  const {username,email,password} = req.body
  const finduser = await client.db("Zuppa").collection("private").findOne({email:email})

  
  if (finduser) {
res.status(400).send({ message:"This user Already exists"})
  } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password,salt)
      const postSignin = await client.db("Zuppa").collection("private").insertOne({username:username,email:email, password:hashedPassword})
      res.status(200).send({postSignin,  message:"Successfully Register"}) 
  }
})

app.post('/login', async function(req,res){
  const {username,password} = req.body
  const userFind = await client.db("Zuppa").collection("private").findOne({username:username})
  

  if (userFind) {
      const strongPassword = userFind.password;
      const passwordCheck = await bcrypt.compare(password,strongPassword)
      if (passwordCheck) {
          const token = Jwt.sign({id:userFind._id},"zuppa2525")
          res.status(200).send({zuppa:token, message:"Successfully Login",_id:userFind._id})
          console.log("Logged IN")

      } else {
          res.status(400).send({message:"Invalid Password"})
      }
  } else {
      res.status(400).send({message:"Invalid User"})
  }
})
//----------------------------------------- All id get --------------------------------------------------------------------

app.get("/getprofile", async function(req,res) {
  

  const getMethod = await client.db("Zuppa").collection("private").find({}).toArray();
  console.log("Successfully", getMethod);
  res.status(200).send(getMethod);
})


//---------------------------------  Single Id -------------------------------------------------------------------
app.get("/profileget/:singleId", async function(req,res) {
  const {singleId} = req.params;

  const getProfile = await client.db("Zuppa").collection("private").findOne({_id: new ObjectId(singleId)});
  console.log("Successfully", getProfile);
  res.status(200).send(getProfile);
})



//-----------------------------------Career Form ---------------------------------------------------
app.post("/careerform", async function(req,res){
  const CareerForm = req.body
  const CareerPost = await client.db("Zuppa").collection("Collection").insertMany([CareerForm])
  res.status(200).send("Successfully Done")
})

//-----------------------------------Resume uploaded-------------------------------

const upload = multer({storage})

app.post('/upload',upload.single('file'), (req,res)=>{

console.log(req.body)
console.log(req.file)
})

app.listen(PORT,()=>{
  console.log("Listening sucessfully",PORT)
})


