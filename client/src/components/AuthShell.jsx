import PropTypes from "prop-types";

const DEFAULT_AUTH_IMAGE_URL =
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=2000&q=80";

function AuthShell({ children, imageUrl = DEFAULT_AUTH_IMAGE_URL, imageAlt = "Không gian nội thất", showImage = true }) {
  return (
    <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="flex">
          {showImage ? (
            <div className="hidden md:block md:w-1/2 relative">
              <img
                src={imageUrl}
                alt={imageAlt}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative h-full min-h-[720px]" />
            </div>
          ) : null}

          <div className={(showImage ? "w-full md:w-1/2" : "w-full") + " p-8 sm:p-10 md:p-12"}>
            <div className="animate-[fadeUp_220ms_ease-out]">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

AuthShell.propTypes = {
  children: PropTypes.node.isRequired,
  imageUrl: PropTypes.string,
  imageAlt: PropTypes.string,
  showImage: PropTypes.bool,
};

export default AuthShell;
