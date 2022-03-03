const { Router } = require("express");
const db = require("../database");

const router = Router();
const { check, validationResult } = require("express-validator");
const apiVersion = 1.0;

//Generate Call ID
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

//Check if the input is numeric
function isNumeric(str) {
  if (typeof str != "string") return false; // we only process strings!
  return (
    !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseFloat(str))
  ); // ...and ensure strings of whitespace fail
}

//validate if student exists
async function userExists(userID) {
  query = `SELECT * FROM mydb.users Where UserID=${userID}`;
  let user = await db.promise().query(query);
  return await user;
}
//Get student Role
async function getUserRole(roleId) {
  query = `SELECT * FROM mydb.roles WHERE RoleID=${roleId}`;
  let role = await db.promise().query(query);
  return await role;
}

//Get one course
async function getCourseDetail(courseId) {
  query = `SELECT * FROM mydb.courses WHERE CourseID=${courseId}`;
  let course = await db.promise().query(query);
  return await course;
}

// Enrol Student to a course
router.post(
  "/enrol",
  [
    check("requestorid")
      .isInt()
      .withMessage("Requestor ID needs to be numeric."),
    check("courseId").isInt().withMessage("Course ID needs to be numeric."),
  ],
  (req, res) => {
    const { courseId } = req.body;
    console.log(courseId);
    const { requestorid } = req.headers;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errorCode: "400-002",
        errorMessage: `Invalid format or value`,
        errorDetails: errors.array(),
        callId: uuid(),
        requestUserId: `${requestorid}`,
        apiVersion: `${apiVersion}`,
        time: new Date(),
      });
    }

    if (requestorid) {
      userExists(requestorid).then(
        (result) => {
          user = result[0];
          if (user.length > 0) {
            getUserRole(user[0].RoleID).then(
              (result) => {
                role = result[0];
                if (role.length > 0) {
                  if (role[0].RoleID === 3) {
                    getCourseDetail(courseId).then(
                      (result) => {
                        course = result[0];
                        if (course.length > 0) {
                          if (course[0].isAvailable === 1) {
                            var sqlQuery = `INSERT INTO mydb.enrolments (CourseID,UserID) VALUES ('${courseId}','${requestorid}')`;
                            db.query(sqlQuery, (err, result) => {
                              if (err) {
                                return res.status(400).json({
                                  errorCode: "400-005",
                                  errorMessage: `Duplicate Record`,
                                  errorDetails: `Requestor ${user[0].Name} is already enrolled to the course ${course[0].Title}.`,
                                  callId: uuid(),
                                  requestUserId: `${requestorid}`,
                                  apiVersion: `${apiVersion}`,
                                  time: new Date(),
                                });
                              } else {
                                console.log(
                                  result.affectedRows + " record(s) Added"
                                );
                                res.status(200).send({
                                  errorCode: "000-000",
                                  callId: uuid(),
                                  requestUserId: `${requestorid}`,
                                  apiVersion: `${apiVersion}`,
                                  msg: ` ${requestorid} enrolled in course ID:${courseId} successfully.`,
                                  time: new Date(),
                                });
                              }
                            });
                          } else {
                            return res.status(400).json({
                              errorCode: "400-100",
                              errorMessage: `Course Inactive`,
                              errorDetails: `Course not available for enrolment.Please contact admin.`,
                              callId: uuid(),
                              requestUserId: `${requestorid}`,
                              apiVersion: `${apiVersion}`,
                              time: new Date(),
                            });
                          }
                        } else {
                          return res.status(400).json({
                            errorCode: "400-001",
                            errorMessage: `Object not Found`,
                            errorDetails: `${courseId} - Course not Found.`,
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
                    return res.status(400).json({
                      errorCode: "400-004",
                      errorMessage: `Role Error`,
                      errorDetails: `Requestor is not a student - ${requestorId}`,
                      callId: uuid(),
                      requestUserId: `${requestorid}`,
                      apiVersion: `${apiVersion}`,
                      time: new Date(),
                    });
                  }
                } else {
                  return res.status(400).json({
                    errorCode: "400-004",
                    errorMessage: `Role Error`,
                    errorDetails: `User ${requestorId} role not defined.`,
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
              errorCode: "400-001",
              errorMessage: `Object not found`,
              errorDetails: `${requestorId} - Requestor not found.`,
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
        errorCode: "400-003",
        errorMessage: `Missing required parameter`,
        errorDetails: `Requestor ID is required.`,
        callId: uuid(),
        requestUserId: `Missing`,
        apiVersion: `${apiVersion}`,
        time: new Date(),
      });
    }
  }
);

// Set Student Marks
router.put(
  "/setMarks/:id",
  [
    check("requestorid")
      .isInt()
      .withMessage("Requestor ID needs to be numeric."),
    check("id").isInt().withMessage("Student ID needs to be numeric."),
    check("courseId").isInt().withMessage("Course ID needs to be numeric."),
    check("marks").isInt().withMessage("Marks needs to be numeric."),
  ],
  (req, res) => {
    const { id } = req.params; //Student ID
    const { courseId, marks } = req.body;
    const { requestorid } = req.headers; // Teacher ID

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errorCode: "400-002",
        errorMessage: `Invalid format or value`,
        errorDetails: errors.array(),
        callId: uuid(),
        requestUserId: `${requestorid}`,
        apiVersion: `${apiVersion}`,
        time: new Date(),
      });
    }

    if (requestorid) {
      userExists(requestorid).then(
        (result) => {
          user = result[0];
          if (user.length > 0) {
            getUserRole(user[0].RoleID).then(
              (result) => {
                role = result[0];
                if (role.length > 0) {
                  if (role[0].RoleID === 2) {
                    var sqlQuery = `UPDATE mydb.enrolments SET Mark = ${marks} WHERE CourseID=${courseId} and UserID=${id};`;
                    db.query(sqlQuery, (err, result) => {
                      if (err) {
                        console.log(err);
                        return res.status(400).json({
                          errorCode: "400-001",
                          errorMessage: `Object not found`,
                          errorDetails: `Student ${id} not enrolled for Course ${courseId}.`,
                          callId: uuid(),
                          requestUserId: `${requestorid}`,
                          apiVersion: `${apiVersion}`,
                          time: new Date(),
                        });
                      }
                      if (result.affectedRows === 0) {
                        res.status(400).send({
                          errorCode: "400-001",
                          errorMessage: `Object not found`,
                          errorDetails: `Student ${id} not enrolled for Course ${courseId}.`,
                          callId: uuid(),
                          requestUserId: `${requestorid}`,
                          apiVersion: `${apiVersion}`,
                          time: new Date(),
                        });
                      } else {
                        console.log(result.affectedRows + " record(s) updated");
                        res.status(200).send({
                          errorCode: "000-000",
                          callId: uuid(),
                          requestUserId: `${requestorid}`,
                          apiVersion: `${apiVersion}`,
                          msg: `Marks updated successfully for Student ${id} enrolled in Course ${courseId} .`,
                          time: new Date(),
                        });
                      }
                    });
                  } else {
                    return res.status(400).json({
                      errorCode: "400-004",
                      errorMessage: `Role Error`,
                      errorDetails: `Requestor ${user[0].Name} is not a teacher.`,
                      callId: uuid(),
                      requestUserId: `${requestorid}`,
                      apiVersion: `${apiVersion}`,
                      time: new Date(),
                    });
                  }
                } else {
                  return res.status(400).json({
                    errorCode: "400-004",
                    errorMessage: `Role Error`,
                    errorDetails: `User ${teacherId} role not defined.`,
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
              errorCode: "400-001",
              errorMessage: `Object not found`,
              errorDetails: `${requestorid} - Teacher not found.`,
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
        errorCode: "400-003",
        errorMessage: `Missing required parameter`,
        errorDetails: `Missing Requestor ID`,
        callId: uuid(),
        requestUserId: `${requestorid}`,
        apiVersion: `${apiVersion}`,
        time: new Date(),
      });
    }
  }
);

module.exports = router;
