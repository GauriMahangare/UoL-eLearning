const express = require("express");
const cookieParser = require("cookie-parser");
const db = require("./database");
//Courses APIs
const courseRoute = require("./routes/course");

//Enrol API
const studentRoute = require("./routes/student");

//Teacher APIs
const teacherRoute = require("./routes/student");

//Middlewares
const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//Generate Call ID
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function userExists(userID) {
  query = `SELECT * FROM mydb.users Where UserID=${userID}`;
  let user = await db.promise().query(query);
  return await user;
}

async function checkPermission(url, method, userRole) {
  query = `SELECT * FROM mydb.Permissions WHERE URL="${url}" AND Method="${method}" AND RoleId=${userRole}`;
  let permission = await db.promise().query(query);
  return await permission;
}
//Logger - Log incoming requests on the console using use middleware.
app.use((req, res, next) => {
  const { requestorid } = req.headers;
  console.log(`${requestorid} - ${req.method} - ${req.url}`);

  //Check request user
  userExists(requestorid).then(
    (result) => {
      user = result[0];
      if (user.length > 0) {
        lowercase = req.url.toLowerCase().trim();
        index = lowercase.indexOf("?");
        if (index > 0) {
          urlArray = lowercase.slice(0, index);
        } else {
          urlArray = lowercase;
        }
        urlArrayFinal = [];
        urlArrayFinal = urlArray.split("/");
        let url = "/";
        for (let i = 0; i < 4; i++) {
          if (urlArrayFinal[i]) {
            url += urlArrayFinal[i] + "/";
          }
        }
        // check the permission for the user role
        checkPermission(url.trim(), req.method, user[0].RoleID).then(
          (result) => {
            permission = result[0];
            if (permission.length > 0) {
              next();
            } else {
              res.status(400).send({
                errorCode: "400-012",
                errorMessage: `Forbidden`,
                errorDetails: `${requestorid} - Permission Error.Permission group associated with the requestor not found or Requestor does not have permission to invoke this API.`,
                callId: uuid(),
                requestUserId: `${requestorid}`,
                apiVersion: `${apiVersion}`,
                time: new Date(),
              });
            }
          },
          (error) => {
            res.status(500).send({
              errorCode: "500-001",
              errorMessage: `Server Error`,
              errorDetails: `${requestorid} - Internal Server Error.`,
              callId: uuid(),
              requestUserId: `${requestorid}`,
              apiVersion: `${apiVersion}`,
              time: new Date(),
            });
          }
        );
      } else {
        res.status(400).send({
          errorCode: "400-012",
          errorMessage: `Forbidden`,
          errorDetails: `${requestorid} - Permission Error.Requestor not defined`,
          callId: uuid(),
          requestUserId: `${requestorid}`,
          apiVersion: `${apiVersion}`,
          time: new Date(),
        });
      }
    },
    (error) => {
      res.status(500).send({
        errorCode: "500-001",
        errorMessage: `Server Error`,
        errorDetails: `${requestorid} - Internal Server Error.`,
        callId: uuid(),
        requestUserId: `${requestorid}`,
        apiVersion: `${apiVersion}`,
        time: new Date(),
      });
    }
  );
  // Check the user role has permission to invoke API
});

const apiVersion = 1;
var courses = 1;

app.get("/api/status", function (req, res) {
  res.send({
    msg: "This is e-Learning API application developed for University of Liverpool",
    status: `Server is running at port number : ${port}`,
  });
});

app.use("/api/courses", courseRoute);
app.use("/api/student", studentRoute);
app.use("/api/teacher", teacherRoute);

//set environment parameter using terminal command for mac - Export PORT=3003
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
