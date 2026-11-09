
import { useCallback, useEffect, useState } from "react";

const API = "http://localhost:9000";

const PRIORITIES = ["High", "Medium", "Low"];
const STATUSES = ["To Do", "In Progress", "Done"];

function UserStories({ project }) {
    const [stories, setStories] = useState([]);
    const [members, setMembers] = useState([]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("Medium");
    const [assignedUserId, setAssignedUserId] = useState("");

    const [editStoryId, setEditStoryId] = useState(null);
    const [status, setStatus] = useState("To Do");

    const [message, setMessage] = useState("");
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    
    function resetForm() {
        setTitle("");
        setDescription("");
        setPriority("Medium");
        setAssignedUserId("");
        setStatus("To Do");
        setEditStoryId(null);
    }

    const loadStories = useCallback(async () => {
        if (!project) {
            setStories([]);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                `${API}/projects/${project._id}/stories`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Could not load stories."
                );
            }

            setStories(data);

        } catch (err) {
            setError(true);
            setMessage(err.message || "Could not load stories.");
        } finally {
            setLoading(false);
        }
    }, [project]);

    const loadMembers = useCallback(async () => {
        if (!project) {
            setMembers([]);
            return;
        }

        try {
            const response = await fetch(
                `${API}/projects/${project._id}/members`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Could not load project members."
                );
            }

            setMembers(data);

        } catch (err) {
            setError(true);
            setMessage(err.message || "Could not load members.");
        }
    }, [project]);

    useEffect(() => {
        resetForm();
        setStories([]);
        setMembers([]);
        setMessage("");
        setError(false);

        if (project) {
            loadStories();
            loadMembers();
        }
    }, [project, loadStories, loadMembers]);

    async function handleSubmit(event) {
        event.preventDefault();

        setMessage("");
        setError(false);

        if (
            !title.trim() ||
            !description.trim() ||
            !priority
        ) {
            setError(true);
            setMessage(
                "Title, description, and priority are required."
            );
            return;
        }

        if (
            assignedUserId &&
            !members.some(
                (member) => member._id === assignedUserId
            )
        ) {
            setError(true);
            setMessage(
                "Please select a current member of this project."
            );
            return;
        }

        setSaving(true);

        try {
            const url = editStoryId
                ? `${API}/projects/${project._id}/stories/${editStoryId}`
                : `${API}/projects/${project._id}/stories`;

            const method = editStoryId ? "PUT" : "POST";

            const body = {
                title: title.trim(),
                description: description.trim(),
                priority,
                assigned_user_id: assignedUserId || null
            };

            if (editStoryId) {
                body.status = status;
            }

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Could not save user story."
                );
            }

            setMessage(
                data.message ||
                (editStoryId
                    ? "Story updated successfully."
                    : "Story created successfully.")
            );

            resetForm();

            await loadStories();

        } catch (err) {
            setError(true);
            setMessage(
                err.message || "Could not connect to server."
            );
        } finally {
            setSaving(false);
        }
    }

    function handleEdit(story) {
        setMessage("");
        setError(false);

        setEditStoryId(story._id);
        setTitle(story.title);
        setDescription(story.description);
        setPriority(story.priority);
        setStatus(story.status);
        setAssignedUserId(
            story.assigned_user_id || ""
        );

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    async function handleDelete(storyId) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this user story? This action cannot be undone."
        );

        if (!confirmed) {
            return;
        }

        setMessage("");
        setError(false);
        setSaving(true);

        try {
            const response = await fetch(
                `${API}/projects/${project._id}/stories/${storyId}`,
                {
                    method: "DELETE"
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Could not delete story."
                );
            }

            if (editStoryId === storyId) {
                resetForm();
            }

            setMessage(
                data.message || "Story deleted successfully."
            );

            await loadStories();

        } catch (err) {
            setError(true);
            setMessage(
                err.message || "Could not connect to server."
            );
        } finally {
            setSaving(false);
        }
    }

    if (!project) {
        return (
            <section className="panel">
                <h2>Project Backlog</h2>
                <p>
                    Select a project above to view and manage its user stories.
                </p>
            </section>
        );
    }

    return (
        <section className="panel">

            <h2>Project Backlog</h2>

            <h3>{project.name}</h3>

            <hr />

            <h3>
                {editStoryId
                    ? "Edit User Story"
                    : "Create User Story"}
            </h3>

            <form onSubmit={handleSubmit}>

                <label htmlFor="story-title">
                    Story Title
                </label>

                <input
                    id="story-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a short story title"
                    required
                />

                <label htmlFor="story-description">
                    Description
                </label>

                <textarea
                    id="story-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="As a [type of user], I want [goal], so that [benefit]."
                    rows="4"
                    required
                />

                <label htmlFor="story-priority">
                    Priority
                </label>

                <select
                    id="story-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                >
                    {PRIORITIES.map((item) => (
                        <option key={item} value={item}>
                            {item}
                        </option>
                    ))}
                </select>

                {editStoryId && (
                    <>
                        <label htmlFor="story-status">
                            Status
                        </label>

                        <select
                            id="story-status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            {STATUSES.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </>
                )}

                <label htmlFor="story-assignee">
                    Assigned Member
                </label>

                <select
                    id="story-assignee"
                    value={assignedUserId}
                    onChange={(e) =>
                        setAssignedUserId(e.target.value)
                    }
                >
                    <option value="">
                        Unassigned
                    </option>

                    {members.map((member) => (
                        <option
                            key={member._id}
                            value={member._id}
                        >
                            {member.username}
                            {member.isLead ? " (Project Lead)" : ""}
                        </option>
                    ))}
                </select>

                {members.length === 0 && (
                    <p className="error">
                        No project members are currently available.
                    </p>
                )}

                <div className="form-buttons">

                    <button
                        type="submit"
                        disabled={saving || members.length === 0}
                    >
                        {saving
                            ? "Saving..."
                            : editStoryId
                                ? "Save Changes"
                                : "Create Story"}
                    </button>

                    {editStoryId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                    )}

                </div>

            </form>

            {message && (
                <p
                    className={error ? "error" : "success"}
                    role="status"
                >
                    {message}
                </p>
            )}

            <hr />

            <div className="section-heading">
                <h3>Project Stories</h3>

                <button
                    type="button"
                    onClick={loadStories}
                    disabled={loading}
                >
                    Refresh
                </button>
            </div>

            {loading && (
                <p>Loading user stories...</p>
            )}

            {!loading && stories.length === 0 && (
                <p>
                    This project does not have any user stories yet.
                    Create a story using the form above.
                </p>
            )}

            {!loading && stories.length > 0 && (
                <div className="story-list">

                    {stories.map((story) => (

                        <article
                            key={story._id}
                            className="story-card"
                        >

                            <h3>{story.title}</h3>

                            <p>
                                <strong>Description:</strong>{" "}
                                {story.description}
                            </p>

                            <p>
                                <strong>Priority:</strong>{" "}
                                {story.priority}
                            </p>

                            <p>
                                <strong>Status:</strong>{" "}
                                {story.status}
                            </p>

                            <p>
                                <strong>Assigned Member:</strong>{" "}
                                {story.assigned_member?.username ||
                                    "Unassigned"}
                            </p>

                            <div className="story-actions">

                                <button
                                    type="button"
                                    onClick={() => handleEdit(story)}
                                    disabled={saving}
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    className="danger-button"
                                    onClick={() =>
                                        handleDelete(story._id)
                                    }
                                    disabled={saving}
                                >
                                    Delete
                                </button>

                            </div>

                        </article>

                    ))}

                </div>
            )}

        </section>
    );
}

export default UserStories;