import {
  faFloppyDisk,
  faSquare,
  faSquareCheck,
} from '@fortawesome/free-regular-svg-icons';
import {
  faArrowUp,
  faFile,
  faGear,
  faHome,
  faMessage,
  faPencil,
  faSquare as faSquareFilled,
  faSquareMinus,
  faUserGroup,
  faRotateRight,
  faRotateBack,
  faTags,
} from '@fortawesome/free-solid-svg-icons';
import {
  FontAwesomeIcon,
  FontAwesomeIconProps,
} from '@fortawesome/react-fontawesome';
import './Icons.css';

function FaIcon(props: FontAwesomeIconProps) {
  const fn = function Default() {
    return <FontAwesomeIcon {...props} className="euiIcon" />;
  };

  fn.GroupItem = function GroupItem() {
    return (
      <FontAwesomeIcon {...props} className="euiIcon euiListGroupItem__icon" />
    );
  };

  fn.Header = function HeaderItem() {
    return (
      <FontAwesomeIcon
        {...props}
        className="euiIcon icon-xl-page-header-title"
      />
    );
  };

  fn.Medium = function MediumIcon() {
    return <FontAwesomeIcon {...props} className="euiIcon icon-m" />;
  };

  fn.Custom = function CustomItem(customProps: Partial<FontAwesomeIconProps>) {
    const custom = { ...props, ...customProps };
    return function Custom() {
      return <FontAwesomeIcon {...custom} />;
    };
  };

  return fn;
}

export const ArrowUpIcon = FaIcon({ icon: faArrowUp });
export const HomeIcon = FaIcon({
  icon: faHome,
});
export const UserGroupIcon = FaIcon({
  icon: faUserGroup,
});
export const FileIcon = FaIcon({
  icon: faFile,
});
export const MessageIcon = FaIcon({ icon: faMessage });
export const GearIcon = FaIcon({ icon: faGear });
export const PencilIcon = FaIcon({ icon: faPencil });
export const SaveIcon = FaIcon({ icon: faFloppyDisk });
export const SquareIcon = FaIcon({ icon: faSquare });
export const SquareFilledIcon = FaIcon({ icon: faSquareFilled });
export const SquareCheckedIcon = FaIcon({ icon: faSquareCheck });
export const SquareMinusIcon = FaIcon({ icon: faSquareMinus });
export const UndoIcon = FaIcon({ icon: faRotateBack });
export const RedoIcon = FaIcon({ icon: faRotateRight });
export const TagsIcon = FaIcon({ icon: faTags });
