import { useQuery } from '@tanstack/react-query';

import { getBusinessProfile, type BusinessProfile } from '../services/firestore';
import { useBusiness } from '../providers/business-provider';

/**
 * Hook to fetch the current business profile including custom terminology
 *
 * @returns React Query result with business profile data
 *
 * @example
 * const { data: business, isLoading } = useBusinessProfile();
 * const customTerms = business?.customTerminology;
 */
export const useBusinessProfile = () => {
  const { businessId } = useBusiness();

  return useQuery<BusinessProfile | null>({
    queryKey: ['business', businessId],
    queryFn: () => {
      if (!businessId) {
        return Promise.resolve(null);
      }
      return getBusinessProfile(businessId);
    },
    enabled: Boolean(businessId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
