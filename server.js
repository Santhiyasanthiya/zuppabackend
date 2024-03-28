
import express from "express";
import cors from "cors"
import { MongoClient, ObjectId} from "mongodb";
import  Jwt  from "jsonwebtoken";
import bcrypt from 'bcrypt';

const app = express();
const PORT = 4000;

app.use(cors())

const url = "mongodb+srv://jeyakesavan:jeyakesavan@cluster0.3lsv3ti.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(url);

await client.connect();
console.log("connected mongodb");
app.use(express.json())


const authentication = (req,res,next)=> 
{

try {pp
  const getToken = req.header("token")
  Jwt.verify(getToken,"zuppa2525")
  next()
} catch (error) {
  res.send({message:error.message})
}
}

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
  const {email,password} = req.body
  const userFind = await client.db("Zuppa").collection("private").findOne({email:email})
  
  
  if (userFind) {
      const strongPassword = userFind.password;
      const passwordCheck = await bcrypt.compare(password,strongPassword)
      if (passwordCheck) {
          const token = Jwt.sign({id:userFind._id},"zuppa2525")
          res.status(200).send({zuppa:token, message:"Successfully Login"})

      } else {
          res.status(400).send({message:"Invalid Password"})
      }
  } else {
      res.status(400).send({message:"Invalid Email id"})
  }
})



app.listen(PORT,()=>{
  console.log("Listenning sucessfully")
})