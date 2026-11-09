
import { useState } from "react";

function SignUp() {
    const [f_name, setFName] = useState("");
    const [l_name, setLName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    async function handleSubmission(event) {
        event.preventDefault();
        setMessage("");

        try {
            const response = await fetch("http://localhost:9000/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    f_name,
                    l_name,
                    username,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Signup failed");
            }

            setMessage(data.message);

            setFName("");
            setLName("");
            setUsername("");
            setPassword("");

        } catch (error) {
            setMessage(error.message || "Couldn't connect to server");
        }
    }

    return (
        <div>
            <h2>Sign Up</h2>

            <form onSubmit={handleSubmission}>
                <div>
                    <label>First Name:</label>
                    <input
                        type="text"
                        value={f_name}
                        onChange={(event) => setFName(event.target.value)}
                        required
                    />
                </div>

                <div>
                    <label>Last Name:</label>
                    <input
                        type="text"
                        value={l_name}
                        onChange={(event) => setLName(event.target.value)}
                        required
                    />
                </div>

                <div>
                    <label>Username:</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        required
                    />
                </div>

                <div>
                    <label>Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />
                </div>

                <button type="submit">Sign Up</button>
            </form>

            {message && <p>{message}</p>}
        </div>
    );
}

export default SignUp;