require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors')
const cookieParser = require('cookie-parser')
const verifyJWT = require('./middleware/verifyJWT');

app = express();

const corsConfig = {
    credentials: true,
    origin: 'https://microblog-wkeo.onrender.com',
    optionSuccessStatus: 200,
};
app.use(cors(corsConfig));

app.use(bodyParser.json())
app.use(cookieParser())

app.use((req, res, next) => {
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE, PATCH');
    res.append('Access-Control-Allow-Origin', 'https://microblog-wkeo.onrender.com');
     res.append('Access-Control-Allow-Headers', ['Content-Type', 'Authorization']);
    next();
});


app.use('/', require('./routes/root'));
app.use("/auth", require("./routes/authRoutes"));
app.use("/refresh", require("./routes/refresh"));
app.use("/register", require('./routes/register'))
app.use(verifyJWT);
app.use('/posts', require('./routes/postRoutes'))
app.use('/logout', require('./routes/logout'));
app.use("/users", require("./routes/userRoutes"));


mongoose.set('strictQuery', false);
mongoose.connect(process.env.DATABASE_URL);

app.listen(3000)
