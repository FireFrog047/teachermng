const express=require('express');
const{body}=require("express-validator");
const authController=require('../controller/auth');

const router=express.Router();

router.get('/showposts',authController.showPosts);
router.get('/createpost',authController.isAuth,authController.createPost);
router.get('/showusers',authController.isAuth,authController.showUsers);
router.post('/login',authController.login);
router.post('/initiateResetPassword',authController.initiateResetPassword);
router.get('/logout',authController.isAuth,authController.logout);
router.put('/updateProfile',authController.isAuth,authController.updateProfile);
router.put('/changePassword',[    
    body('newPassword')
     .trim()
     .isLength({min:6})
     .withMessage('Enter Password atleast 6 charecter Long')
     .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/)
     .withMessage('Password must contains at least 1 Uppercase 1 lowercase and 1 Number')    
],authController.isAuth,authController.changePassword);
router.get('/initiateConfirmEmail',authController.isAuth,authController.initiateConfirmEmail);

router.post('/validateConfirmEmail',authController.validateConfirmEmail)
router.put('/validateResetPassword',[    
    body('password')
     .trim()
     .isLength({min:6})
     .withMessage('Enter Password atleast 6 charecter Long')
     .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/)
     .withMessage('Password must contains at least 1 Uppercase 1 lowercase and 1 Number')    
],authController.validateResetPassword);

module.exports=router;