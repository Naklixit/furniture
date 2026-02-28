const { Readable } = require("stream");
const cloudinary = require("../config/cloudinary");

const uploadBuffer = ({ buffer, folder, publicId, resourceType = "image" }) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        overwrite: true,
      },
      (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

const deleteResource = async (publicId, resourceType = "image") => {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch {
    return null;
  }
};

const deleteResourcesByPrefix = async (prefix, resourceType = "image") => {
  if (!prefix) return null;
  try {
    return await cloudinary.api.delete_resources_by_prefix(prefix, {
      resource_type: resourceType,
    });
  } catch {
    return null;
  }
};

const deleteFolder = async (folderPath) => {
  if (!folderPath) return null;
  try {
    return await cloudinary.api.delete_folder(folderPath);
  } catch {
    return null;
  }
};

module.exports = {
  uploadBuffer,
  deleteResource,
  deleteResourcesByPrefix,
  deleteFolder,
};
