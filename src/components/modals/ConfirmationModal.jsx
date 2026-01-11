import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, config = {}, loading = false }) => {
  if (!isOpen) return null;

  const {
    title = 'Confirm Action',
    message = 'Are you sure?',
    type = 'info',
    confirmText = 'Confirm'
  } = config;

  const getColorScheme = () => {
    switch (type) {
      case 'danger':
        return {
          icon: AlertTriangle,
          iconColor: 'text-red-600',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          accentColor: 'bg-red-50 border-red-200'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-orange-600',
          buttonColor: 'bg-orange-600 hover:bg-orange-700',
          accentColor: 'bg-orange-50 border-orange-200'
        };
      case 'info':
      default:
        return {
          icon: CheckCircle2,
          iconColor: 'text-blue-600',
          buttonColor: 'bg-blue-600 hover:bg-blue-700',
          accentColor: 'bg-blue-50 border-blue-200'
        };
    }
  };

  const scheme = getColorScheme();
  const IconComponent = scheme.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
        {/* Header with close button */}
        <div className={`flex items-start justify-between p-6 border-b ${scheme.accentColor} border`}>
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full ${scheme.accentColor}`}>
              <IconComponent size={24} className={scheme.iconColor} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message */}
        <div className="p-6">
          <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 ${scheme.buttonColor} text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
