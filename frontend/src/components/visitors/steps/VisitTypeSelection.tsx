'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Package } from 'lucide-react';
import { VisitCategory } from '@/lib/constants/visit-constants';

interface VisitTypeSelectionProps {
  visitorName?: string;
  isReturningVisitor: boolean;
  lastVisitInfo?: string;
  onSelect: (category: VisitCategory) => void;
  onBack?: () => void;
}

export function VisitTypeSelection({
  visitorName,
  isReturningVisitor,
  lastVisitInfo,
  onSelect,
  onBack,
}: VisitTypeSelectionProps) {
  return (
    <div className="space-y-6" data-testid="visit-type-selection">
      {/* Header */}
      <div className="text-center space-y-2">
        {isReturningVisitor && visitorName ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back, {visitorName}! 👋
            </h2>
            {lastVisitInfo && (
              <p className="text-sm text-gray-500">
                ⓘ Last visit: {lastVisitInfo}
              </p>
            )}
          </>
        ) : (
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome to Our Hospital
          </h2>
        )}
        <p className="text-lg text-gray-600 mt-4">What brings you here today?</p>
      </div>

      {/* Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Meeting Card */}
        <Card
          className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200 group"
          onClick={() => onSelect(VisitCategory.MEETING)}
        >
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Meeting</h3>
              <p className="text-gray-500 mt-1">
                Coming to meet someone at the hospital
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Card */}
        <Card
          className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200 group"
          onClick={() => onSelect(VisitCategory.DELIVERY)}
        >
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <Package className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Delivery</h3>
              <p className="text-gray-500 mt-1">
                Delivering goods, packages, or food
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Back button for returning visitors */}
      {onBack && (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={onBack}>
            ← Not you? Enter a different phone number
          </Button>
        </div>
      )}
    </div>
  );
}

export default VisitTypeSelection;
