import { useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const emptyForm = {
  assetName: "",
  assetType: "",
  location: "",
  description: "",
  file: null
};

function App() {
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadAssets() {
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/assets`);

      if (!response.ok) {
        throw new Error("Could not load assets.");
      }

      setAssets(await response.json());
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssets();
  }, []);

  function handleChange(event) {
    const { name, value, files } = event.target;

    setForm((current) => ({
      ...current,
      [name]: files ? files[0] : value
    }));
  }

  function editAsset(asset) {
    setEditingId(asset.Id);

    setForm({
      assetName: asset.AssetName || "",
      assetType: asset.AssetType || "",
      location: asset.Location || "",
      description: asset.Description || "",
      file: null
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    const formData = new FormData();

    formData.append("assetName", form.assetName);
    formData.append("assetType", form.assetType);
    formData.append("location", form.location);
    formData.append("description", form.description);

    if (form.file) {
      formData.append("file", form.file);
    }

    const url = editingId
      ? `${API_URL}/api/assets/${editingId}`
      : `${API_URL}/api/assets`;

    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Request failed.");
      }

      setMessage(
        editingId
          ? "Asset updated successfully."
          : "Asset created successfully."
      );

      setEditingId(null);
      setForm(emptyForm);

      const fileInput = document.querySelector(
        'input[name="file"]'
      );

      if (fileInput) {
        fileInput.value = "";
      }

      await loadAssets();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteAsset(id) {
    const confirmed = window.confirm(
      "Delete this asset and its uploaded document?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/api/assets/${id}`,
        {
          method: "DELETE"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Delete failed.");
      }

      setMessage("Asset deleted.");
      await loadAssets();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Azure CRUD Demo</p>
        <h1>Asset Document Manager</h1>
        <p>
          React frontend, Node.js API, Azure SQL metadata
          and Azure Blob Storage documents.
        </p>
      </section>

      <section className="card">
        <h2>
          {editingId ? "Edit asset" : "Add asset"}
        </h2>

        <form
          className="form-grid"
          onSubmit={handleSubmit}
        >
          <label>
            Asset name
            <input
              required
              name="assetName"
              value={form.assetName}
              onChange={handleChange}
              placeholder="Air Handling Unit 01"
            />
          </label>

          <label>
            Asset type
            <input
              name="assetType"
              value={form.assetType}
              onChange={handleChange}
              placeholder="HVAC"
            />
          </label>

          <label>
            Location
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Manchester Office"
            />
          </label>

          <label>
            Document
            <input
              type="file"
              name="file"
              onChange={handleChange}
            />
          </label>

          <label className="wide">
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="4"
              placeholder="Asset description..."
            />
          </label>

          <div className="actions wide">
            <button type="submit">
              {editingId ? "Update asset" : "Create asset"}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {message && (
          <div className="message">
            {message}
          </div>
        )}
      </section>

      <section className="card">
        <div className="table-header">
          <h2>Assets</h2>
          <button
            className="secondary"
            onClick={loadAssets}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : assets.length === 0 ? (
          <p>No assets found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Document</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.Id}>
                    <td>{asset.AssetName}</td>
                    <td>{asset.AssetType || "-"}</td>
                    <td>{asset.Location || "-"}</td>
                    <td>
                      {asset.OriginalFileName ? (
                        <a
                          href={`${API_URL}/api/assets/${asset.Id}/download`}
                        >
                          {asset.OriginalFileName}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="secondary"
                          onClick={() =>
                            editAsset(asset)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="danger"
                          onClick={() =>
                            deleteAsset(asset.Id)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
