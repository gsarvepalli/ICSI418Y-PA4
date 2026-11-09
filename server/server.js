require("dotenv").config();

const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");

const client = new MongoClient(process.env.MONGO_URI);

const app = express();
const PORT = 9000;

app.use(express.json());
app.use(cors());

let users;
let projects;
let projectMemberships;
let userStories;

const VALID_STATUSES = ["Planning", "Active", "Completed"];
const STORY_STATUSES = ["To Do", "In Progress", "Done"];
const STORY_PRIORITIES = ["High", "Medium", "Low"];

function isValidId(id) {
    return (
        typeof id === "string" &&
        ObjectId.isValid(id) &&
        new ObjectId(id).toString() === id
    );
}

function publicUser(user) {
    return {
        _id: user._id,
        username: user.username
    };
}

function validateStoryFields(body, includeStatus = false) {
    const { title, description, priority, status } = body;

    if (
        typeof title !== "string" ||
        !title.trim() ||
        typeof description !== "string" ||
        !description.trim() ||
        !STORY_PRIORITIES.includes(priority)
    ) {
        return "Title, description, and valid priority are required.";
    }

    if (includeStatus && !STORY_STATUSES.includes(status)) {
        return "Invalid story status.";
    }

    return null;
}

// DATABASE CONNECTION

async function connectDatabase() {
    await client.connect();

    const db = client.db("pa3");

    users = db.collection("users");
    projects = db.collection("projects");
    projectMemberships = db.collection("projectMemberships");
    userStories = db.collection("userStories");

    await projectMemberships.createIndex(
        { project_id: 1, user_id: 1 },
        { unique: true }
    );

    await userStories.createIndex({ project_id: 1 });

    console.log("Connected to MongoDB");
}

// SERVER CHECK

app.get("/", (req, res) => {
    res.json({
        message: "Server is running"
    });
});

// SIGNUP

app.post("/signup", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (
            typeof username !== "string" ||
            !username.trim() ||
            typeof password !== "string" ||
            !password
        ) {
            return res.status(400).json({
                message: "Username and password required"
            });
        }

        const existingUser = await users.findOne({
            username: username.trim()
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Username already exists"
            });
        }

        await users.insertOne({
            username: username.trim(),
            password: password
        });

        res.status(201).json({
            message: "User created successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

// LOGIN

app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password required"
            });
        }

        const user = await users.findOne({ username });

        if (!user || user.password !== password) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        res.status(200).json({
            message: "Login successful"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

// GET USERS

app.get("/users", async (req, res) => {
    try {
        const allUsers = await users.find(
            {},
            { projection: { username: 1 } }
        ).toArray();

        res.json(allUsers.map(publicUser));

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Could not retrieve users"
        });
    }
});

// CREATE PROJECT

app.post("/projects", async (req, res) => {
    try {
        const {
            name,
            description,
            status,
            project_lead_id
        } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof description !== "string" ||
            !description.trim() ||
            !VALID_STATUSES.includes(status) ||
            !isValidId(project_lead_id)
        ) {
            return res.status(400).json({
                message: "Provide valid project information."
            });
        }

        const lead = await users.findOne({
            _id: new ObjectId(project_lead_id)
        });

        if (!lead) {
            return res.status(404).json({
                message: "Selected Project Lead does not exist."
            });
        }

        const project = {
            name: name.trim(),
            description: description.trim(),
            status,
            project_lead_id: lead._id
        };

        const result = await projects.insertOne(project);

        try {
            await projectMemberships.insertOne({
                project_id: result.insertedId,
                user_id: lead._id
            });
        } catch (error) {
            await projects.deleteOne({
                _id: result.insertedId
            });

            throw error;
        }

        res.status(201).json({
            message: "Project created successfully",
            project: {
                _id: result.insertedId,
                ...project
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Could not create project"
        });
    }
});

// GET PROJECTS

app.get("/projects", async (req, res) => {
    try {
        const allProjects = await projects.find({}).toArray();

        const result = await Promise.all(
            allProjects.map(async (project) => {
                const lead = await users.findOne(
                    { _id: project.project_lead_id },
                    { projection: { username: 1 } }
                );

                return {
                    ...project,
                    project_lead: lead ? publicUser(lead) : null
                };
            })
        );

        res.json(result);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Could not retrieve projects"
        });
    }
});

// GET PROJECT MEMBERS

app.get("/projects/:id/members", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Invalid project ID"
            });
        }

        const project = await projects.findOne({
            _id: new ObjectId(id)
        });

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        const memberships = await projectMemberships.find({
            project_id: project._id
        }).toArray();

        const members = await Promise.all(
            memberships.map(async (membership) => {
                const user = await users.findOne({
                    _id: membership.user_id
                });

                if (!user) return null;

                return {
                    ...publicUser(user),
                    isLead: user._id.equals(project.project_lead_id)
                };
            })
        );

        res.json(members.filter(Boolean));

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Could not retrieve project members"
        });
    }
});


// ADD PROJECT MEMBER

app.post("/projects/:id/members", async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        if (!isValidId(id) || !isValidId(user_id)) {
            return res.status(400).json({
                message: "Valid project ID and user ID are required"
            });
        }

        const project = await projects.findOne({
            _id: new ObjectId(id)
        });

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        const user = await users.findOne({
            _id: new ObjectId(user_id)
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        try {
            await projectMemberships.insertOne({
                project_id: project._id,
                user_id: user._id
            });

        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({
                    message: "This user is already a member of the project"
                });
            }

            throw error;
        }

        res.status(201).json({
            message: "Member added successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Could not add project member"
        });
    }
});


// REMOVE PROJECT MEMBER

app.delete(
    "/projects/:id/members/:userId",
    async (req, res) => {
        try {
            const { id, userId } = req.params;

            if (!isValidId(id) || !isValidId(userId)) {
                return res.status(400).json({
                    message: "Invalid project ID or user ID"
                });
            }

            const project = await projects.findOne({
                _id: new ObjectId(id)
            });

            if (!project) {
                return res.status(404).json({
                    message: "Project not found"
                });
            }

            const memberId = new ObjectId(userId);

            // Project Lead cannot be removed

            if (project.project_lead_id.equals(memberId)) {
                return res.status(409).json({
                    message: "The Project Lead cannot be removed."
                });
            }

            // Verify membership exists

            const membership = await projectMemberships.findOne({
                project_id: project._id,
                user_id: memberId
            });

            if (!membership) {
                return res.status(404).json({
                    message: "Membership not found"
                });
            }

            // Check whether member has assigned stories

            const assignedStory = await userStories.findOne({
                project_id: project._id,
                assigned_user_id: memberId
            });

            if (assignedStory) {
                return res.status(409).json({
                    message: "Reassign, unassign, or delete this member's stories before removing them from the project."
                });
            }

            // Remove membership

            await projectMemberships.deleteOne({
                project_id: project._id,
                user_id: memberId
            });

            res.json({
                message: "Member removed successfully"
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Could not remove project member"
            });
        }
    }
);

// HELPER: VALIDATE STORY ASSIGNMENT

async function validateAssignment(projectId, assignedUserId) {
    // Null means Unassigned

    if (assignedUserId === null) {
        return null;
    }

    if (!isValidId(assignedUserId)) {
        return "Invalid assigned member ID.";
    }

    const userId = new ObjectId(assignedUserId);

    // Verify user exists

    const user = await users.findOne({
        _id: userId
    });

    if (!user) {
        return "Assigned user does not exist.";
    }

    // Verify user belongs to selected project

    const membership = await projectMemberships.findOne({
        project_id: projectId,
        user_id: userId
    });

    if (!membership) {
        return "Assigned user must be a member of this project.";
    }

    return userId;
}


// GET STORIES FOR A PROJECT

app.get("/projects/:projectId/stories", async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!isValidId(projectId)) {
            return res.status(400).json({
                message: "Invalid project ID."
            });
        }

        const project = await projects.findOne({
            _id: new ObjectId(projectId)
        });

        if (!project) {
            return res.status(404).json({
                message: "Project not found."
            });
        }

        const stories = await userStories.find({
            project_id: project._id
        }).sort({ _id: -1 }).toArray();

        // Attach readable assigned member names

        const result = await Promise.all(
            stories.map(async (story) => {
                let assignedMember = null;

                if (story.assigned_user_id) {
                    const user = await users.findOne({
                        _id: story.assigned_user_id
                    });

                    if (user) {
                        assignedMember = publicUser(user);
                    }
                }

                return {
                    ...story,
                    assigned_member: assignedMember
                };
            })
        );

        res.json(result);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Could not retrieve user stories."
        });
    }
});


// CREATE USER STORY

app.post("/projects/:projectId/stories", async (req, res) => {
    try {
        const { projectId } = req.params;

        const {
            title,
            description,
            priority,
            assigned_user_id
        } = req.body;

        if (!isValidId(projectId)) {
            return res.status(400).json({
                message: "Invalid project ID."
            });
        }

        const project = await projects.findOne({
            _id: new ObjectId(projectId)
        });

        if (!project) {
            return res.status(404).json({
                message: "Project not found."
            });
        }

        const validationError = validateStoryFields(req.body);

        if (validationError) {
            return res.status(400).json({
                message: validationError
            });
        }

        // Validate assignment

        const assignment = await validateAssignment(
            project._id,
            assigned_user_id === undefined ? null : assigned_user_id
        );

        if (typeof assignment === "string") {
            return res.status(400).json({
                message: assignment
            });
        }

        // Construct story document

        const story = {
            project_id: project._id,
            title: title.trim(),
            description: description.trim(),
            priority,
            status: "To Do",
            assigned_user_id: assignment
        };

        const result = await userStories.insertOne(story);

        res.status(201).json({
            message: "User story created successfully.",
            story: {
                _id: result.insertedId,
                ...story
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Could not create user story."
        });
    }
});


// EDIT USER STORY

app.put(
    "/projects/:projectId/stories/:storyId",
    async (req, res) => {
        try {
            const { projectId, storyId } = req.params;

            const {
                title,
                description,
                priority,
                status,
                assigned_user_id
            } = req.body;

            if (!isValidId(projectId) || !isValidId(storyId)) {
                return res.status(400).json({
                    message: "Invalid project or story ID."
                });
            }

            const project = await projects.findOne({
                _id: new ObjectId(projectId)
            });

            if (!project) {
                return res.status(404).json({
                    message: "Project not found."
                });
            }

            const storyQuery = {
                _id: new ObjectId(storyId),
                project_id: project._id
            };

            const existingStory = await userStories.findOne(storyQuery);

            if (!existingStory) {
                return res.status(404).json({
                    message: "User story not found in this project."
                });
            }

            const validationError = validateStoryFields(
                req.body,
                true
            );

            if (validationError) {
                return res.status(400).json({
                    message: validationError
                });
            }

            // Validate assignment

            const assignment = await validateAssignment(
                project._id,
                assigned_user_id === undefined ? null : assigned_user_id
            );

            if (typeof assignment === "string") {
                return res.status(400).json({
                    message: assignment
                });
            }

            // Update only editable fields

            const updates = {
                title: title.trim(),
                description: description.trim(),
                priority,
                status,
                assigned_user_id: assignment
            };

            const result = await userStories.updateOne(
                storyQuery,
                { $set: updates }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    message: "User story not found."
                });
            }

            res.json({
                message: "User story updated successfully."
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Could not update user story."
            });
        }
    }
);


// DELETE USER STORY

app.delete(
    "/projects/:projectId/stories/:storyId",
    async (req, res) => {
        try {
            const { projectId, storyId } = req.params;

            if (!isValidId(projectId) || !isValidId(storyId)) {
                return res.status(400).json({
                    message: "Invalid project or story ID."
                });
            }

            const project = await projects.findOne({
                _id: new ObjectId(projectId)
            });

            if (!project) {
                return res.status(404).json({
                    message: "Project not found."
                });
            }

            const result = await userStories.deleteOne({
                _id: new ObjectId(storyId),
                project_id: project._id
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    message: "User story not found."
                });
            }

            res.json({
                message: "User story deleted successfully."
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Could not delete user story."
            });
        }
    }
);


// START SERVER

async function startServer() {
    try {
        await connectDatabase();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Could not start server:", error);
        process.exit(1);
    }
}

startServer();