const express= require("express");
const{body}=require("express-validator");

const router=express.Router();

const userController=require('../controller/users');
const User =require('../models/users');

router.get('/',userController.getShowHome);
router.post('/',userController.postShowHome);
router.post('/createuser',[
    body('email')
     .trim()
     .isEmail()
     .withMessage('Please Enter a valid email')
     .custom((value,{req})=>{
        return User
            .findOne({email:value})
            .then(emailValue=>{
                if(emailValue){
                    return Promise.reject('Email already exist');
                }
            });
     }),
    // body('userName')
    //  .trim()
    //  .custom((value,{req})=>{
    //     return User
    //         .findOne({userName:value})
    //         .then(userNameValue=>{
    //             if(userNameValue){
    //                 return Promise.reject('User Name already exist');
    //             }
    //         });
    //  }),
    // body('mobileNumber')
    //  .trim()
    //  .notEmpty()
    //  .withMessage('Mobile number required')
    //  .isLength({min:11,max:11})
    //  .withMessage('Valid mobile number required 11 digit'),  
    body('name')
     .trim()
     .not()
     .isEmpty()
     .withMessage('Enter Name'),
    body('password')
     .trim()
     .isLength({min:6})
     .withMessage('Enter Password atleast 6 charecter Long')
     .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/)
     .withMessage('Password must contains at least 1 Uppercase 1 lowercase and 1 Number')
],userController.createUser);

router.post('/checkExistEmail',[
    body('email')
     .notEmpty()
     .withMessage('email address is required')
     .trim()
     .isEmail()
     .normalizeEmail()
     .withMessage('Please Enter a valid email')
     .custom((value,{req})=>{
        return User
            .findOne({email:value})
            .then(emailValue=>{
                if(emailValue){
                    return Promise.reject('Email already exist');
                }
            });
     }),
],userController.checkExistEmail);

router.post('/checkExistUserName',[
    body('userName')
     .notEmpty()
     .withMessage('email address is required')
     .trim()
     .custom((value,{req})=>{
        return User
            .findOne({userName:value})
            .then(userNameValue=>{
                if(userNameValue){
                    return Promise.reject('User Name already exist');
                }
            });
     }), 
],userController.checkExistUserName);

module.exports=router;