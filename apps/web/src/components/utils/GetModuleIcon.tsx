import {
  CashIcon,
  ClockIcon,
  DocumentAddIcon,
  PlusCircleIcon,
  ReceiptRefundIcon,
  ShareIcon,
  StarIcon
} from '@heroicons/react/outline';
import { CollectModules, FollowModules, ReferenceModules } from 'lens';
import type { FC } from 'react';

interface Props {
  module: string;
  size: number;
}

const GetModuleIcon: FC<Props> = ({ module, size }) => {
  switch (module) {
    case CollectModules.FeeCollectModule:
      return <CashIcon className={`h-${size}`} />;
    case CollectModules.LimitedFeeCollectModule:
      return (
        <div className="flex items-center gap-1">
          <StarIcon className={`h-${size}`} />
          <CashIcon className={`h-${size}`} />
        </div>
      );
    case CollectModules.LimitedTimedFeeCollectModule:
      return (
        <div className="flex items-center gap-1">
          <StarIcon className={`h-${size}`} />
          <ClockIcon className={`h-${size}`} />
          <CashIcon className={`h-${size}`} />
        </div>
      );
    case CollectModules.TimedFeeCollectModule:
      return (
        <div className="flex items-center gap-1">
          <ClockIcon className={`h-${size}`} />
          <CashIcon className={`h-${size}`} />
        </div>
      );
    case CollectModules.RevertCollectModule:
      return <ReceiptRefundIcon className={`h-${size}`} />;
    case CollectModules.FreeCollectModule:
      return <DocumentAddIcon className={`h-${size}`} />;
    case FollowModules.FeeFollowModule:
      return (
        <div className="flex items-center gap-1">
          <CashIcon className={`h-${size}`} />
          <PlusCircleIcon className={`h-${size}`} />
        </div>
      );
    case ReferenceModules.FollowerOnlyReferenceModule:
      return (
        <div className="flex items-center gap-1">
          <PlusCircleIcon className={`h-${size}`} />
          <ShareIcon className={`h-${size}`} />
        </div>
      );
    default:
      return <CashIcon className={`h-${size}`} />;
  }
};

export default GetModuleIcon;
