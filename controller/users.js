const User=require('../models/users');
const{validationResult}=require("express-validator");
const bcrypt=require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv=require('dotenv');
dotenv.config();

const refreshSecretKey=process.env.jwt_refreshSecretKey;
const secretKey=process.env.jwt_secretKey;

exports.createUser=async(req,res,next)=>{ 
   const validationResultError=validationResult(req);
   if(!validationResultError.isEmpty())
   {
      const error= new Error('Input Validation failed');
      error.statusCode=422;
      error.data=validationResultError.array();
      next(error);
   }
   else{
      const email=req.body.email;
      const name=req.body.name;
      const password=req.body.password;
      try{
         const hashedPassword=await bcrypt.hash(password,12);
         const user=new User({
            email:email.toLowerCase(),
            name:name,
            password:hashedPassword,
         });
         const confirmUser=await user.save();
         const refreshToken=jwt.sign(
               {
                  userId: confirmUser._id.toString(),
                  email: confirmUser.email
               },
               refreshSecretKey,
               {expiresIn:'24h'});
         const accessToken=jwt.sign(
               {
                  userId: confirmUser._id.toString(),
                  email: confirmUser.email
               },
               secretKey,
               {expiresIn:'20m'});
         await User.updateOne({_id:confirmUser._id},{
            accessToken:accessToken,
            refreshToken:refreshToken});
         res.status(201).json({message:'User Created',Token:accessToken});
      }
      catch(err){
         if(!err.statusCode){
            err.statusCode=500;
         }
         err.message='User creation failed';
         err.data=err.errors;
         console.log(err);
         next(err);
      };
   }
};

exports.checkExistEmail=(req,res,next)=>{
   const validationResultError=validationResult(req);

   if(!validationResultError.isEmpty())
   {
      const error= new Error('Validation Error');
      error.statusCode=422;
      error.data=validationResultError.array();
      throw error;
   }
   else{
      res.status(200).json({message:'Email address is valid'});
   }
};

exports.checkExistUserName=(req,res,next)=>{
   const validationResultError=validationResult(req);

   if(!validationResultError.isEmpty())
   {
      const error= new Error('Validation Error');
      error.statusCode=422;
      error.data=validationResultError.array();
      throw error;
   }
   else{
      res.status(200).json({message:'User Name is valid'});
   }
};

exports.postShowHome=(req,res,next)=>{
   console.log(req);
   res.status(200).json({message:'working'});
};
exports.getShowHome=(req,res,next)=>{
   res.status(200).json({message:'working'});
};