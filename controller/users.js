const User=require('../models/users');
const{validationResult}=require("express-validator");
const bcrypt=require('bcryptjs');
const jwt = require('jsonwebtoken');

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
      const userName=req.body.userName;
      const role=req.body.role;
      const mobileNumber=req.body.mobileNumber;
      const password=req.body.password;
      const division=req.body.division;
      const city=req.body.city;
      try{
         const hashedPassword=await bcrypt.hash(password,12);
         const user=new User({
            email:email.toLowerCase(),
            name:name,
            userName:userName,
            role:role,
            mobileNumber:mobileNumber,
            password:hashedPassword,
            division:division,
            city:city
         });
         const confirmUser=await user.save();
         const refreshSecretKey='8MvQCbvPh37r7Y0a5jQTAEywjGWUNbrpEMi7Z5/RXG2N0gxHllkZG2IRzrw+1MaKHozPVM6GxbTQHrdmnyyeH7b+IpIZd6/qeWCoc4O1ccLv0vq40a+N/4grFqG6w+3NnrU0Q/W1THX/pESGB1SkY1/2er1tFDbTFSdTl/w0Js6GV5gD7cC5xGvK7lYcduQKNKXCzbulKt0Tf8qJkSnQfDGAnNed9QD4ObARSUT5X0Dl3nwHyfIi2ofySlms/v41ItHwFIVJ1Pkr7iwrdAUpLzyENf4ywNkN3kwcOgjg5V7mpSa6by2vZevQ5MdEoW6PnGf6LGEKtf6wQFF/IDySyg';
         const refreshToken=jwt.sign(
               {
                  userId:' confirmUser._id.toString()',
                  email: 'confirmUser.email'
               },
               refreshSecretKey,
               {expiresIn:'24h'});
         const secretKey='8UUyVG8oESWqXZUMGiRwXUlRGSJc1MMeGz3UemdFjl7ZZOMVYArUHBONWP/LcyIBi4DDoaTis8FZdCMLCXgXkpG6E1zuBCZfpifUEJuNDd3bRExY8qKnS1EwlKC2maJA/AFMsaW+M3CYlWCnz4x56qVyKd6s7t63sYRStKCugAhanaY3lsYWnDog0rRzLvfQiytOGfmf2e0ni1+WpuUrT1Sw/8y6xCAE7p4JiNfFKktCKyHy74klhW8iZmpGsBEV/86hgQ2JPt1nrXbuWX2HCi2jIKmRPegZgzePnY2lVOg9xnV1chHjGV81ZVvTzVPp9sxDqFbsddcK31YTcD3n9Q';
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

exports.showUsers=async (req,res,next)=>{
   try{
      const users=await User.find();
      res.status(200).json(users);
   }
   catch(err){
      if(!err.statusCode){
         err.statusCode=500;
      }
      err.message='Server Connection Failed';
      err.data=err.errors;
      next(err);   
   }
};

exports.showHome=(req,res,next)=>{
   res.status(200).json({message:'working',id:req.userId,key:req.headers});
};