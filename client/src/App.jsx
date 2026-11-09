import { useState } from "react";
import Signup from "./components/Signup";
import Login from "./components/Login";
import CreateProject from "./components/CreateProject";
import ProjectList from "./components/ProjectList";
import ProjectMembers from "./components/ProjectMembers";
import UserStories from "./components/UserStories";
import "./App.css";

function App() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleProjectCreated() {
    setRefreshKey((previous) => previous + 1);
  }

  return (
    <div>
      <h1>User Authentication</h1>
      <Signup />
      <hr />
      <Login />

      <hr />

      <h1>Project Management</h1>

      <CreateProject onProjectCreated={handleProjectCreated} />

      <ProjectList
        refreshKey={refreshKey}
        onSelectProject={setSelectedProject}
        selectedProjectId={selectedProject?._id}
      />

      <ProjectMembers project={selectedProject} />
      <UserStories
        key={selectedProject?._id || "no-project"}
        project={selectedProject}
      />
    </div>
  );
}

export default App;