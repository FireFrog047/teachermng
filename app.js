const express= require("express");
const bodyParser= require("body-parser");
const mongoose= require("mongoose");

const userRoute=require('./routes/users');
const authRoute=require('./routes/auth');
let port=process.env.PORT||3000;

const app= express();

app.use(bodyParser.json());

app.use((req,res,next)=>{
    res.setHeader('Access-Controll-Allow-Origin', '*');
    res.setHeader('Access-Controll-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Controll-Allow-Headers', 'Content-Type, Authorization');
    next();
});

app.get('/',(req,res,next)=>{

    res.status(201).send('working');
});
app.use('/user',userRoute);
app.use('/auth',authRoute);

app.use((error,req,res,next)=>{
    res.status(error.statusCode || 500).json({message:error.message, data:error.data});
});
mongoose
    .connect('mongodb+srv://test:test@teachermng.cboef.mongodb.net/teachermng?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(result=>{
        app.listen(port);
    })
    .catch(err=>{
        console.log('Database connection failed'+err);
    });