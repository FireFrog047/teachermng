const bcrypt = require('bcryptjs');
const crypto=require('crypto');
const dotenv=require('dotenv');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const User =require('../models/users');
const User_data =require('../models/userdata');
const User_posts =require('../models/posts');

const nodemailer = require('nodemailer');
const {google} = require('googleapis');
dotenv.config();
const client_secret=process.env.mail_client_secret;
const refresh_token=process.env.mail_refresh_token;
const client_id=process.env.mail_client_id;
const redirectUri=process.env.mail_redirectUri;

// console.log(require('crypto').randomBytes(256).toString('base64'))
const refreshSecretKey=process.env.jwt_refreshSecretKey;
const secretKey=process.env.jwt_secretKey;

const oAuth2Client= new google.auth.OAuth2(client_id,client_secret,redirectUri);
oAuth2Client.setCredentials({refresh_token:refresh_token});

async function sendmail(sendFrom,sendTo,sendSubject,sendText,sendHtml){
    try{
        const accessToken = await oAuth2Client.getAccessToken();
        const transport= nodemailer.createTransport({
            service:'gmail',
            auth:{
                type:'OAuth2',
                user:'monjurul.47@gmail.com',
                clientId:client_id,
                clientSecret:client_secret,
                refreshToken:refresh_token,
                accessToken:accessToken
            }
        });
        const mailOptions={
            from: sendFrom,
            to: sendTo,
            subject: sendSubject,
            text: sendText,
            html: sendHtml
        };
        const result = await transport.sendMail(mailOptions);
        return result;
    }
    catch(error){
        return error;
    }
};

exports.isAuth=async (req,res,next)=>{

    const scKeyHeader=req.get('authorization');
    let decodedUserScKey,userScKey,validReqUser;

    if(!scKeyHeader){
        const error=new Error('Not Authenicated, Please log in');
        error.statusCode=401;
        next(error);
    }else{
        userScKey=scKeyHeader.split(' ')[1];
        try{
            decodedUserScKey=await jwt.verify(userScKey,secretKey);
            console.log('Secret key token after verification '+JSON.stringify(decodedUserScKey));

        }catch{
            const error=new Error('Not Authenicated, Please log in');
            error.statusCode=401;
            next(error);
        }
        if(!decodedUserScKey){
            let tempId;
            try{
                const tempKeyId=await jwt.verify(userScKey,secretKey ,{ignoreExpiration: true});
                tempId=tempKeyId.userId;
                validReqUser=await User.findOne({_id:tempId});
            }
            catch(err){
                return next(err);
            }
            if(!validReqUser){
                const error=new Error('Invalid user token');
                error.statusCode=401;
                return next(error);
            }
            if(!validReqUser.refreshToken){
                const error=new Error('No session active, please log in');
                error.statusCode=401;
                return next(error);
            }
            if(userScKey==validReqUser.accessToken){
                
                try{
                    const validSession=await jwt.verify(validReqUser.refreshToken,refreshSecretKey);
                    console.log('Refresh token after verification'+JSON.stringify(validSession));
                    if(!validSession){
                        const error=new Error('Session expired');
                        error.statusCode=402;
                        return next(error);
                    }
                    const newUserScKey=jwt.sign(
                    {   
                        userId: validReqUser._id.toString(),
                        email: validReqUser.email,
                    },
                    secretKey,
                    {expiresIn:'20m'});
                    await User.updateOne({_id:tempId},{
                    accessToken:newUserScKey
                    });
                    req.headers['authorization'] ='Bearer '+newUserScKey;
                    req.userId=validReqUser._id.toString();
                    console.log(`New access token genarated ${newUserScKey}`);
                    next();
                }
                catch(err){
                    return next(err);
                }
            }
            else{
                const error=new Error('Token replased. Log in again');
                error.statusCode=401;
                return next(error);
            }
        }else{
            try{
                req.userId=decodedUserScKey.userId;
                console.log(decodedUserScKey.userId);
                next();

            }catch(err){
                return next(err);
            }
        }
    }
};

exports.updateProfile=async (req,res,next)=>{    
    const valueToUpdate=['name','userName','role','mobileNumber','division','city'];
    let valueForDb={};
    try{
        valueToUpdate.forEach(value =>{
            if (req.body[value]){
                valueForDb[value]=req.body[value];
            }
        });
        const updateSuccess=await User.updateOne({_id:req.userId},valueForDb)
        if(updateSuccess.nModified>0){
            res.status(201).json({'Message':'Update Successfull'});
        }
        else{
            res.status(400).json({'Message':'Update is not successfull'});
        }
    }
    catch(err){
        res.status(400).json(err);
    }
}

exports.login=async (req,res,next)=>{
    const email =req.body.email;
    const password=req.body.password;
    try{
        const user=await User.findOne({email:email});
        if(!user){
            const error=new Error('No user found with this email');
            error.statusCode=401;
            error.data=error.errors;
            next(error);
        }
        const validUser=await(bcrypt.compare(password,user.password));
        if(!validUser){
            const error=new Error('Wrong Password');
            error.statusCode=401;
            error.data=error.errors;
            next(error);
        }else{

            const token=jwt.sign(
                {
                    userId: user._id.toString(),
                    email: user.email,
                },
                secretKey,
                {expiresIn:'20m'});
            
            const refreshToken=jwt.sign(
                {
                    userId: user._id.toString(),
                    email: user.email,
                },
                refreshSecretKey,
                {expiresIn:'24h'});
            await User.updateOne({email:user.email},
            {accessToken:token, refreshToken:refreshToken});
            res.status(200).json({token:token});
        }
    }
    catch(err){
        if(!err.statusCode){
            err.statusCode=500;
         }
         err.message='Internal Server Error';
         err.data=err.errors;
         next(err);
     };

};

exports.logout=async (req,res,next)=>{
    try{
        await User.updateOne({_id:req.userId}, {
            accessToken:'',
            refreshToken:''
        });
        res.status(200).json({message:'Logout successfull',id:req.userId})
    }catch(err){
        if(!err.statusCode){
            err.statusCode=500;
        }
        next(err);
    }
};

exports.changePassword=async (req,res,next)=>{
    const validationResultError=validationResult(req);

    if(!validationResultError.isEmpty()){
      const error= new Error('Input Validation failed');
      error.statusCode=422;
      error.data=validationResultError.array();
      return next(error);
    }

    try{
        const currentPassword=req.body.currentPassword;
        const newPassword=req.body.newPassword;
        const user= await User.findOne({_id:req.userId});
        const validUser=await(bcrypt.compare(currentPassword,user.password));
        if(!validUser){
            const error=new Error('Wrong Password');
            error.statusCode=401;
            error.data=error.errors;
            next(error);
        }else{               
            const refreshToken=jwt.sign(
                {
                    userId: user._id.toString(),
                    email: user.email,
                },
                refreshSecretKey,
                {expiresIn:'24h'});
            const newHashedPassword=await bcrypt.hash(newPassword,12);
            await User.updateOne({_id:req.userId},
            {refreshToken:refreshToken, password:newHashedPassword});
            res.status(200).json({message:"Password changed"});
        }
    }catch(err){
        if(!err.statusCode){
            err.statusCode=500;
        }
        next(err);
    }
};

exports.initiateResetPassword=async (req,res,next)=>{
    const email=req.body.email;

    try{
        const validUser=await User.findOne({email:email});

        if(!validUser){
            const error=new Error('No user found with this email');
            error.statusCode=404;
            next(error);
        }
        else{
            
            const resetPwToken=crypto.randomBytes(32).toString('base64');
            const resetPwTokenExpDate=Date.now()+3600000;

            await User.updateOne({_id:validUser._id},{
                resetPwToken:resetPwToken,
                resetPwTokenExpDate:resetPwTokenExpDate
            })
            //(sendFrom,sendTo,sendSubject,sendText,sendHtml)
            const mailResult=await sendmail(
                'Teacher Mangement <monjurul.47@gmail.com>',
                validUser.email,
                'Reset Password request',
                `Password reset request issued for ${validUser.name}. Please click this link to reset your password http://localhost:8080/auth/respwt${resetPwToken}`,
                `<h1>Password reset request issued for ${validUser.name}</h1>.
                 <p>Please click this <a href="http://localhost:8080/auth/respwt${resetPwToken}">link </a>to reset your password. This link will valid for next 24 hours</p>`
            );

            if(!mailResult.accepted){
                const error= new Error('Email sending failed');
                error.statusCode=500;
                next(error);
            }else{
                res.status(200).json({message:`Please check your email to reset password`});
            }
        }
    }catch(error){
        if(!error.statusCode){
            error.statusCode=500;
        }
        next(error);
    }
};

exports.initiateConfirmEmail=async (req,res,next)=>{
    try{
        validUser=await User.findOne({_id:req.userId});
        if(!validUser){
            const error=new Error('No user With this Id');
            error.statusCode=404;
            next(error);
        }
        else if(validUser.confirmMailToken){
            if(validUser.confirmMailToken=='verified'){
                const error=new Error('Email address is already verified');
                error.statusCode=403;
                next(error);
            }else{
                const error=new Error('Verificatiom email already sent');
                error.statusCode=403;
                next(error);
            }
        }
        // send mail with genaretaed code;
        else{
            const confirmMailToken=crypto.randomBytes(32).toString('base64');
            await User.updateOne({_id:validUser._id},{
                confirmMailToken:confirmMailToken
            })
            //(sendFrom,sendTo,sendSubject,sendText,sendHtml)
            const mailResult=await sendmail(
                'Teacher Mangement <monjurul.47@gmail.com>',
                validUser.email,
                'Confirm Emailrequest',
                `Email confirmation requested for ${validUser.userName}. Please click this link to to verify your email http://localhost:8080/auth/cnfmailt${confirmMailToken}`,
                `<h1>Password reset request issued for ${validUser.userName}</h1>.
                 <p>Please click this <a href="http://localhost:8080/auth/cnfmailt${confirmMailToken}">link </a>to to to verify your email.</p>`
            );
            if(!mailResult.accepted){
                const error= new Error('Email sending failed');
                error.statusCode=500;
                console.log(mailResult);
                next(error);
            }else{
                res.status(200).json({message:`Please check your email with a verification email`});
            }
        }
    }
    catch(err){
        err.statusCode=500;
        throw err;  
    }
};

exports.validateConfirmEmail=async (req,res,next)=>{
    const urlConfirmMailToken=req.body.urlConfirmMailToken;
    try{
        const validUser=await User.findOne({confirmMailToken:urlConfirmMailToken});
        if(!validUser){
            const error=new Error('Invalid token');
            error.statusCode=401;
            next(error);
        }else{
            await User.updateOne({_id:validUser._id},{confirmMailToken:'verified'});
            res.status(200).json({message:'Email verification successfull'})
        }
    }catch(error){
        if(!error.statusCode){
            error.statusCode=500;
        };
        next(error);
    }
};

exports.validateResetPassword=async (req,res,next)=>{
    const validationResultError=validationResult(req);
    if(!validationResultError.isEmpty()){
      const error= new Error('Input Validation failed');
      error.statusCode=422;
      error.data=validationResultError.array();
      next(error);
    }
    try{
        const urlConfirmPasswordToken=req.body.urlConfirmPasswordToken;
        const newPassword=req.body.password;
        const validUser= await User.findOne({resetPwToken:urlConfirmPasswordToken});
        if(!validUser){
            const error=new Error('Wrong Password');
            error.statusCode=401;
            error.data=error.errors;
            next(error);
        }else if(validUser.resetPwTokenExpDate<Date.now()){
            const error=new Error('Link expired');
            error.statusCode=403;
            error.data=error.errors;
            next(error);
        }
        else{              
            const refreshToken=jwt.sign(
                {
                    userId: validUser._id.toString(),
                    email: validUser.email,
                },
                refreshSecretKey,
                {expiresIn:'24h'});
            const newHashedPassword=await bcrypt.hash(newPassword,12);;
            await User.updateOne({_id:validUser._id},
            {refreshToken:refreshToken, password:newHashedPassword, resetPwToken:'',resetPwTokenExpDate:''});
            res.status(200).json({message:"password changed"});
        }
    }
    catch(error){
        if(!error.statusCode){
            error.statusCode=500;
        };
        next(error);
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

//post management
exports.showPosts=async (req,res,next)=>{
   try{
      const all_posts=await User_posts.find();
      res.status(200).json(all_posts);
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

exports.createPost=async (req,res,next)=>{
   try{
      const validUser= await User.findOne({_id:req.userId});
      const newPost= new User_posts({
        authorId:req.userId,
        authorEmail:validUser.email,
        post:[{title:req.body.title},{content:req.body.content}]
      })
      const confirmP=await newPost.save();
      res.status(200).json(confirmP);
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

exports.deletePost=async (req,res,next)=>{
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

exports.updatePost=async (req,res,next)=>{
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