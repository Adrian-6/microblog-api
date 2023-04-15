require('dotenv').config()
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios')

const authThroughGoogle = async (req, res) => {
    try {
        const { code, redirect_uri } = req.query; // code from service provider which is appended to the frontend's URL
        const client_id = process.env.CLIENT_ID;
        const client_secret = process.env.CLIENT_SECRET;
        const grant_type = 'authorization_code'; // this tells the service provider to return a code which will be used to get a token for making requests to the service provider
        const url = 'https://oauth2.googleapis.com/token'; // link to api to exchange code for token.
        const access_type = 'offline'
        const { data } = await axios({
            url,
            method: 'POST',
            params: {
                access_type,
                client_id,
                client_secret,
                redirect_uri,
                code,
                grant_type,
            }
        });

        const tokenFromGoogle = data.access_token;

        const urlForGettingUserInfo = 'https://openidconnect.googleapis.com/v1/userinfo';

        const userData = await axios({
            url: urlForGettingUserInfo,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${tokenFromGoogle}`,
            },
        });

        let userEmail = userData.data.email.split('@').shift() // get the part of email before '@'

        //if email has a dot ('.') in it, remove it
        const dotCheck = userEmail.split('.')
        if (dotCheck.length !== 1) {
            userEmail = dotCheck.join('')
        }

        const cookies = req.cookies;
        let foundUser = await User.findOne({ email: userEmail })

        if (!foundUser) {


            await User.create({
                username: userData.data.name,
                email: userEmail,
                profilePictureURL: userData.data.picture,
                serviceProvider: 'google',
            })
            foundUser = await User.findOne({ email: userEmail })
        }

        foundUser.refreshToken.push(data.refresh_token)
        // create JWTs
        const accessToken = jwt.sign(
            {
                "UserInfo": {
                    "email": foundUser.email,
                }
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '10m' }
        );
        const newRefreshToken = jwt.sign(
            { "email": foundUser.email },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '24h' }
        );

        // Changed to let keyword
        let newRefreshTokenArray =
            !cookies?.jwt
                ? foundUser.refreshToken
                : foundUser.refreshToken.filter(rt => rt !== cookies.jwt);

        if (cookies?.jwt) {

            const refreshToken = cookies.jwt;
            const foundToken = await User.findOne({ refreshToken }).exec();

            // Detected refresh token reuse!
            if (!foundToken) {
                // clear out ALL previous refresh tokens
                newRefreshTokenArray = [];
            }

            res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
        }

        // Saving refreshToken with current user
        foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken];
        await foundUser.save();

        // Creates Secure Cookie with refresh token
        res.cookie('jwt', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000 });

        // Send access token to user
        res.json({ accessToken });

    } catch (err) {
        console.log(err.stack)
    }
}
const handleLogin = async (req, res) => {
    const cookies = req.cookies;
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ 'message': 'Username and password are required.' });

    const foundUser = await User.findOne({ email: email }).exec();
    if (!foundUser) return res.sendStatus(401); //Unauthorized 
    // evaluate password 
    const match = await bcrypt.compare(password, foundUser.password);
    if (!match) {
        return res.sendStatus(401);
    }
    // create JWTs
    const accessToken = jwt.sign(
        {
            "UserInfo": {
                "email": foundUser.email,
            }
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '10m' }
    );
    const newRefreshToken = jwt.sign(
        { "email": foundUser.email },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '24h' }
    );

    // Changed to let keyword
    let newRefreshTokenArray =
        !cookies?.jwt
            ? foundUser.refreshToken
            : foundUser.refreshToken.filter(rt => rt !== cookies.jwt);

    if (cookies?.jwt) {
        try {
            /* 
            Scenario added here: 
                1) User logs in but never uses RT and does not logout 
                2) RT is stolen
                3) If 1 & 2, reuse detection is needed to clear all RTs when user logs in
            */
            const refreshToken = cookies.jwt
            const foundToken = await User.findOne({ refreshToken }).exec()

            // Detected refresh token reuse!
            if (!foundToken) {
                // clear out ALL previous refresh tokens
                newRefreshTokenArray = []
            }

            res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true })
        } catch (err) {
            console.log(err)
        }
    }

    // Saving refreshToken with current user
    foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken];
    await foundUser.save();

    // Creates Secure Cookie with refresh token
    res.cookie('jwt', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000 });

    // Send authorization roles and access token to user
    res.json({ accessToken });
}

module.exports = { handleLogin, authThroughGoogle };
