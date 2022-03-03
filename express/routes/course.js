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

//validate if teacher exists
async function userExists(userID) {
  query = `SELECT * FROM mydb.users Where UserID=${userID}`;
  let user = await db.promise().query(query);
  return await user;
}
//Get Teacher Role
async function getUserRole(roleId) {
  query = `SELECT * FROM mydb.roles WHERE RoleID=${roleId}`;
  let role = await db.promise().query(query);
  return await role;
}
//Get All courses
async function getAllCourses(query) {
  let courses = await db.promise().query(query);
  return await courses;
}
//Get one course
async function getCourseDetail(courseId) {
  query = `SELECT * FROM mydb.courses WHERE CourseID=${courseId}`;
  let course = await db.promise().query(query);
  return await course;
}

// Get all courses from the Database
router.get("/", async (req, res) => {
  const { status, order, limit } = req.query;
  const { requestorid } = req.headers;
  let statusQuery = "";
  if (status) {
    if (!((status === "1") | (status === "0"))) {
      return res.status(400).json({
        errorCode: "400-002",
        errorMessage: `Invalid format or value`,
        errorDetails: `Status valid values are 0,1 (0-Not available and 1-Available) `,
        callId: uuid(),
        requestUserId: `${requestorid}`,
        apiVersion: `${apiVersion}`,
        time: new Date(),
      });
    } else {
      if ((status === "1") | (status === "0")) {
        statusQuery = "WHERE isAvailable=" + parseInt(status);
      }
    }
  }
  if (order) {
    if (!((order === "ASC") | (order === "DESC"))) {
      return res.status(400).json({
        errorCode: "400-002",
        errorMessage: `Invalid format or value`,
        errorDetails: `Order valid values are ASC and DESC (ASC - Ascending , DESC - Descending) `,
        callId: uuid(),
        requestUserId: `${requestorid}`,
        apiVersion: `${apiVersion}`,
        time: new Date(),
      });
    } else {
      orderQuery = `ORDER BY Title ${order}`;
      if (statusQuery === "") {
        statusQuery = orderQuery;
      } else {
        statusQuery = statusQuery + " " + orderQuery;
      }
    }
  }

  if (limit) {
    if (!isNumeric(limit) | (limit === "0")) {
      return res.status(400).json({
        errorCode: "400-002",
        errorMessage: `Invalid format or value`,
        errorDetails: `Limit must be numeric and should be 1 or more`,
        callId: uuid(),
        requestUserId: `${requestorid}`,
        apiVersion: `${apiVersion}`,
        time: new Date(),
      });
    } else {
      limitQuery = `LIMIT ${parseInt(limit)}`;
      if (statusQuery === "") {
        statusQuery = limitQuery;
      } else {
        statusQuery = statusQuery + " " + limitQuery;
      }
    }
  }
  //get all courses from the database

  sql = `SELECT * FROM mydb.courses ${statusQuery}`;

  getAllCourses(sql).then(
    (result) => {
      courses = result[0];
      if (courses.length > 0) {
        res.status(200).send(courses);
      } else {
        res.status(201).send({
          errorCode: "200-001",
          errorMessage: `No records selected`,
          errorDetails: `${statusQuery} - No records selected. Try changing the filter.`,
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
});

// Get detail of one course
router.get(
  "/detail/:id",
  [
    check("requestorid")
      .isInt()
      .withMessage("Requestor ID needs to be numeric."),
    check("id").isInt().withMessage("Course ID needs to be numeric."),
  ],
  (req, res) => {
    const { id } = req.params; //Student ID
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
            getCourseDetail(id).then(
              (result) => {
                course = result[0];
                if (course.length > 0) {
                  if (course[0].isAvailable) {
                    userExists(course[0].TeacherID).then(
                      (result) => {
                        teacher = result[0];
                        if (teacher.length > 0) {
                          return res.status(200).json({
                            errorCode: "000-000",
                            courseTitle: `${course[0].Title}`,
                            teacherName: `${teacher[0].Name}`,
                          });
                        } else {
                          return res.status(400).json({
                            errorCode: "400-001",
                            errorMessage: `Object not Found`,
                            errorDetails: `${course[0].TeacherID} - Teacher not Found.`,
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
                      errorCode: "400-102",
                      errorMessage: `Course is not available.`,
                      errorDetails: `${course[0].Title} - Course is not available.`,
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
            res.status(400).send({
              errorCode: "400-001",
              errorMessage: `Object not found`,
              errorDetails: `${requestorid} - Requestor not found.`,
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

// Method to assign a teacher to a course
router.put(
  "/assignteacher/:id",
  [
    check("requestorid")
      .isInt()
      .withMessage("Requestor ID needs to be numeric."),
    check("id").isInt().withMessage("Course ID needs to be numeric."),
    check("teacherId").isInt().withMessage("Teacher ID needs to be numeric."),
  ],
  (req, res) => {
    const { teacherId } = req.body;
    const { id } = req.params;
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
    if (id && requestorid) {
      if (teacherId) {
        userExists(teacherId).then(
          (result) => {
            user = result[0];
            if (user.length > 0) {
              getUserRole(user[0].RoleID).then(
                (result) => {
                  role = result[0];
                  if (role.length > 0) {
                    if (role[0].RoleID === 2) {
                      var sqlQuery = `UPDATE mydb.courses SET TeacherID = ${teacherId} WHERE CourseID=${id}`;
                      db.query(sqlQuery, (err, result) => {
                        if (err) {
                          console.log(err);
                          return res.status(500).json({
                            errorCode: "500-002",
                            errorMessage: `Database Connection Error`,
                            errorDetails: err.array(),
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
                            errorDetails: `${id} - Course not found.`,
                            callId: uuid(),
                            requestUserId: `${requestorid}`,
                            apiVersion: `${apiVersion}`,
                            time: new Date(),
                          });
                        } else {
                          console.log(
                            result.affectedRows + " record(s) updated"
                          );
                          res.status(200).send({
                            errorCode: "000-000",
                            callId: uuid(),
                            requestUserId: `${requestorid}`,
                            apiVersion: `${apiVersion}`,
                            msg: `${id} - Course ${id} assigned to Teacher - ${user[0].Name} successfully.`,
                            time: new Date(),
                          });
                        }
                      });
                    } else {
                      return res.status(400).json({
                        errorCode: "400-004",
                        errorMessage: `Role Error`,
                        errorDetails: `Cannot assign this user ${teacherId} to the course.`,
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
                errorDetails: `${teacherId} - Teacher not found.`,
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
      }
    } else {
      res.status(400).send({
        errorCode: "400-003",
        errorMessage: `Missing required parameter`,
        errorDetails: `Missing required parameter`,
        callId: uuid(),
        requestUserId: `${requestorid}`,
        apiVersion: `${apiVersion}`,
        time: new Date(),
      });
    }
  }
);

// Method to update enable or disable the availability of a course
router.put(
  "/setstatus/:id",
  [
    check("requestorid")
      .isInt()
      .withMessage("Requestor ID needs to be numeric."),
    check("isAvailable")
      .isIn(["0", "1"])
      .withMessage(
        "Valid values are 0 and 1 (0-Not available and 1-Available)"
      ),
    check("id").isInt().withMessage("Course ID needs to be numeric."),
  ],
  (req, res) => {
    const { isAvailable, teacherId } = req.body;
    const { id } = req.params;
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
    if (id && requestorid) {
      if (isAvailable) {
        var sqlQuery = `UPDATE mydb.courses SET isAvailable = ${isAvailable} WHERE CourseID=${id}`;
        db.query(sqlQuery, (err, result) => {
          if (err) {
            console.log(err);
            return res.status(500).json({
              errorCode: "500-002",
              errorMessage: `Database Connection Error`,
              errorDetails: err.array(),
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
              errorDetails: `${id} - Course not found.`,
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
              msg: `${id} - Course updated successfully.`,
              time: new Date(),
            });
          }
        });
      } else {
        res.status(400).send({
          errorCode: "400-003",
          errorMessage: `Missing required parameter`,
          errorDetails: `${id} - Missing required parameter`,
          callId: uuid(),
          requestUserId: `${requestorid}`,
          apiVersion: `${apiVersion}`,
          time: new Date(),
        });
      }
    }
  }
);

module.exports = router;
