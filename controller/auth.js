const bcrypt = require('bcryptjs');
const crypto=require('crypto');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User =require('../models/users');
const nodemailer = require('nodemailer');
const {google} = require('googleapis');

const client_secret='3FmWMdwmwjgFv0je1I1SF8ii'
const refresh_token='1//04RSRzJa2eO-HCgYIARAAGAQSNwF-L9Irfz4zsvSvMCYwd84q6GPK58JugcWKpbnWOPJPcD6OaxfnGi-7oxyI_o8n2OsCnHNgkWA'
const client_id='141860614225-27i3ks26rcgcu03e2raoru8niobodamg.apps.googleusercontent.com'
const redirectUri='https://developers.google.com/oauthplayground';

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


// console.log(require('crypto').randomBytes(256).toString('base64'))
const refreshSecretKey='8MvQCbvPh37r7Y0a5jQTAEywjGWUNbrpEMi7Z5/RXG2N0gxHllkZG2IRzrw+1MaKHozPVM6GxbTQHrdmnyyeH7b+IpIZd6/qeWCoc4O1ccLv0vq40a+N/4grFqG6w+3NnrU0Q/W1THX/pESGB1SkY1/2er1tFDbTFSdTl/w0Js6GV5gD7cC5xGvK7lYcduQKNKXCzbulKt0Tf8qJkSnQfDGAnNed9QD4ObARSUT5X0Dl3nwHyfIi2ofySlms/v41ItHwFIVJ1Pkr7iwrdAUpLzyENf4ywNkN3kwcOgjg5V7mpSa6by2vZevQ5MdEoW6PnGf6LGEKtf6wQFF/IDySyg';
const secretKey='8UUyVG8oESWqXZUMGiRwXUlRGSJc1MMeGz3UemdFjl7ZZOMVYArUHBONWP/LcyIBi4DDoaTis8FZdCMLCXgXkpG6E1zuBCZfpifUEJuNDd3bRExY8qKnS1EwlKC2maJA/AFMsaW+M3CYlWCnz4x56qVyKd6s7t63sYRStKCugAhanaY3lsYWnDog0rRzLvfQiytOGfmf2e0ni1+WpuUrT1Sw/8y6xCAE7p4JiNfFKktCKyHy74klhW8iZmpGsBEV/86hgQ2JPt1nrXbuWX2HCi2jIKmRPegZgzePnY2lVOg9xnV1chHjGV81ZVvTzVPp9sxDqFbsddcK31YTcD3n9Q';

exports.isAuth=async (req,res,next)=>{

    const scKeyHeader=req.get('authorization');
    let decodedUserScKey,userScKey;

    if(!scKeyHeader){
        const error=new Error('NO token header');
        error.statusCode=401;
        next(error);
    }else{
        userScKey=scKeyHeader.split(' ')[1];
        try{
            decodedUserScKey=await jwt.verify(userScKey,secretKey);

        }catch{
            console.log('secret key failed');
        }
        if(!decodedUserScKey){
            let tempId;
            try{
                const tempKeyId=await jwt.verify(userScKey,secretKey ,{ignoreExpiration: true});
                tempId=tempKeyId.userId;
            }
            catch(err){
                err.statusCode=500;
                err.message='jwt rfrsh decode failed';
                return next(err);
            }
            const validReqUser=await User.findOne({_id:tempId});
            if(!validReqUser){
                const error=new Error('Invalid user token');
                error.statusCode=401;
                return next(error);
            }
            if(!validReqUser.refreshToken){
                const error=new Error('Please Log in');
                error.statusCode=401;
                return next(error);
            }
            if(userScKey==validReqUser.accessToken){
                const newUserScKey=jwt.sign(
                    {   
                        userId: validReqUser._id.toString(),
                        email: validReqUser.email,
                    },
                    secretKey,
                    {expiresIn:'1s'});
                await User.updateOne({_id:tempId},{
                    accessToken:newUserScKey
                });
                req.headers['authorization'] ='Bearer '+newUserScKey;
                req.userId=validReqUser._id.toString();
                next();

            }
            else{
                const error=new Error('Token too old. Log in again');
                error.statusCode=401;
                return next(error);
            }
        }else{
            try{


                req.userId=decodedUserScKey.userId;
                next();

            }catch(err){

            }

        }
    }
};

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
                `Password reset request issued for ${validUser.userName}. Please click this link to reset your password http://localhost:8080/auth/respwt${resetPwToken}`,
                `<h1>Password reset request issued for ${validUser.userName}</h1>.
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