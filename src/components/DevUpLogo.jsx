// DevUp Academy Logo Component
export const DevUpLogo = ({ size = 100, className = "" }) => {
  return (
    <img
      src="/logo.png"
      alt="DevUp Academy"
      style={{ width: size, height: size }}
      className={`${className} object-contain`}
    />
  );
};

export const DevUpLogoWithText = ({ size = 40, showSubtitle = true }) => {
  return (
    <div className="flex items-center gap-3">
      <DevUpLogo size={size} />
      {showSubtitle && (
        <div>
          <p className="font-poppins font-black text-slate-800 dark:text-white text-lg leading-none">
            DevUp
          </p>
          <p className="font-medium text-slate-400 dark:text-slate-500 text-xs">
            
          </p>
        </div>
      )}
    </div>
  );
};
