
import { useCallback, useEffect, useState } from "react";

const API = "http://localhost:9000";

function ProjectBacklog({ project, refreshKey = 0 }) {
  const [stories, setStories] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedStory, setSelectedStory] = useState(null);

  const loadBacklog = useCallback(async () => {
    if (!project) {
      setStories([]);
      setMembers([]);
      setSelectedStory(null);
      return;
    }

    setLoading(true);
    setMessage("");
    setSelectedStory(null);

    try {
      const [storyResponse, memberResponse] = await Promise.all([
        fetch(`${API}/projects/${project._id}/stories`),
        fetch(`${API}/projects/${project._id}/members`)
      ]);

      const storyData = await storyResponse.json();
      const memberData = await memberResponse.json();

      if (!storyResponse.ok) {
        throw new Error(
          storyData.message || "Could not load stories"
        );
      }

      if (!memberResponse.ok) {
        throw new Error(
          memberData.message || "Could not load members"
        );
      }

      setStories(storyData);
      setMembers(memberData);
    } catch (error) {
      setMessage(error.message || "Could not load project backlog");
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    loadBacklog();
  }, [loadBacklog, refreshKey]);

  function getAssignedMember(story) {
    if (!story.assigned_user_id) {
        return "Unassigned";
    }

    return story.assigned_member?.username || "Unknown member";
}

    const member = members.find(
      (item) => item._id === story.assigned_user_id
    );

    return member ? member.username : "Unknown member";
  }

  if (!project) {
    return (
      <section className="panel">
        <h2>Project Backlog</h2>
        <p>Select a project to view its backlog.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Project Backlog</h2>

        <button type="button" onClick={loadBacklog}>
          Refresh Backlog
        </button>
      </div>

      <h3>{project.name}</h3>

      {loading && <p>Loading backlog...</p>}

      {message && (
        <p className="error" role="alert">
          {message}
        </p>
      )}

      {!loading && !message && stories.length === 0 && (
        <p>This project does not have any user stories yet.</p>
      )}

      {!loading && stories.length > 0 && (
        <>
          <p>Total stories: {stories.length}</p>

          <div className="story-list">
            {stories.map((story) => (
              <article
                key={story._id}
                className="story-card"
              >
                <h3>{story.title}</h3>

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
                  {getAssignedMember(story)}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedStory(
                      selectedStory?._id === story._id
                        ? null
                        : story
                    )
                  }
                >
                  {selectedStory?._id === story._id
                    ? "Hide Description"
                    : "View Description"}
                </button>

                {selectedStory?._id === story._id && (
                  <div className="story-description">
                    <strong>Description:</strong>
                    <p>{story.description}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default ProjectBacklog;