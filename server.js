const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let tasks = [
  { text: "Wake up early", completed: false },
  { text: "Study Node.js", completed: false }
];

app.get("/tasks", (req, res) => {
  res.json(tasks);
});

app.post("/add-task", (req, res) => {
  const newTask = {
    text: req.body.task,
    completed: false
  };

  tasks.push(newTask);
  res.send("Task added");
});

app.post("/delete-task", (req, res) => {
  const index = req.body.index;
  tasks.splice(index, 1);
  res.send("Task deleted");
});

app.post("/toggle-task", (req, res) => {
  const index = req.body.index;
  tasks[index].completed = !tasks[index].completed;
  res.send("Task updated");
});

app.post("/edit-task", (req, res) => {
  const { index, newText } = req.body;
  tasks[index].text = newText;
  res.send("Task updated");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});