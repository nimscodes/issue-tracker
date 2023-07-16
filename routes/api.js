"use strict";
require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

const IssueSchema = new mongoose.Schema({
  issue_title: { type: String, required: true },
  issue_text: { type: String, required: true },
  created_on: { type: Date, default: Date.now },
  updated_on: { type: Date, default: Date.now },
  created_by: { type: String, required: true },
  assigned_to: String,
  open: { type: Boolean, default: true },
  status_text: String,
});

const Issue = mongoose.model("Issue", IssueSchema);

module.exports = function (app) {
  app
    .route("/api/issues/:project")

    .get(async (req, res) => {
      try {
        const project = req.params.project;
        const query = req.query;

        // Convert query parameters to the correct data types
        if (query.open !== undefined) query.open = query.open === "true";
        if (query.created_on) query.created_on = new Date(query.created_on);
        if (query.updated_on) query.updated_on = new Date(query.updated_on);

        // Find issues with query filters
        const issues = await Issue.find(query);

        res.json(issues);
      } catch (error) {
        res.status(500).json({ error: "Server Error" });
      }
    })

    .post(async (req, res) => {
      try {
        const { project } = req.params;
        const { issue_title, issue_text, created_by, assigned_to, status_text } = req.body;
    
        // Create new issue from the Issue model
        const newIssue = new Issue({
          issue_title,
          issue_text,
          created_by,
          assigned_to: assigned_to || '',
          status_text: status_text || '',
        });
    
        // Save the issue
        const savedIssue = await newIssue.save();
    
        res.json(savedIssue);
      } catch (error) {
        if (error.name === 'ValidationError') {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        res.status(500).json({ error: 'Server Error' });
      }
    })

    .put(async (req, res) => {
      const { project } = req.params;
      const {
        _id,
        issue_title,
        issue_text,
        created_by,
        assigned_to,
        status_text,
        open,
      } = req.body;

      // Check for _id field
      if (!_id) {
        return res.status(400).json({ error: "missing _id" });
      }

      // Check if no fields to update
      if (
        !issue_title &&
        !issue_text &&
        !created_by &&
        !assigned_to &&
        !status_text &&
        open === undefined
      ) {
        return res.status(400).json({ error: "no update field(s) sent", _id });
      }

      try {
        // Update the issue
        const updatedIssue = await Issue.findOneAndUpdate(
          { _id },
          {
            issue_title,
            issue_text,
            created_by,
            assigned_to,
            status_text,
            open,
            updated_on: new Date(),
          },
          { new: true, omitUndefined: true } // 'new' returns the updated issue, 'omitUndefined' omits undefined fields
        );

        // Check if the issue does not exist
        if (!updatedIssue) {
          return res.status(404).json({ error: "could not update", _id });
        }

        res.json({ result: "successfully updated", _id });
      } catch (error) {
        if (error.name === "CastError") {
          return res.status(400).json({ error: "invalid _id", _id });
        }
        res.status(500).json({ error: "Server Error" });
      }
    })

    .delete(async (req, res) => {
      const { project } = req.params;
      const { _id } = req.body;

      // Check for _id field
      if (!_id) {
        return res.status(400).json({ error: "missing _id" });
      }

      try {
        // Delete the issue
        const deletedIssue = await Issue.findOneAndDelete({ _id });

        // Check if the issue does not exist
        if (!deletedIssue) {
          return res.status(404).json({ error: "could not delete", _id });
        }

        res.json({ result: "successfully deleted", _id });
      } catch (error) {
        if (error.name === "CastError") {
          return res.status(400).json({ error: "invalid _id", _id });
        }
        res.status(500).json({ error: "Server Error" });
      }
    });
};
