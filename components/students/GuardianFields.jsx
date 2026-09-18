import { Controller } from 'react-hook-form';
import { FiUsers } from 'react-icons/fi';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import { GUARDIAN_RELATIONSHIPS } from '@/lib/students';

export default function GuardianFields({ register, control, errors, prefix, required = false }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Relationship {required && <span className="text-red-500">*</span>}
        </label>
        <Controller
          name={`${prefix}.relationship`}
          control={control}
          render={({ field }) => (
            <Dropdown
              placeholder="Select relationship"
              icon={<FiUsers className="w-4 h-4" />}
              options={GUARDIAN_RELATIONSHIPS.map((rel) => ({ value: rel, label: rel }))}
              value={field.value}
              onChange={field.onChange}
              error={errors?.relationship?.message}
            />
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Name {required && <span className="text-red-500">*</span>}
        </label>
        <Input
          placeholder="Enter full name"
          error={errors?.fullName?.message}
          {...register(`${prefix}.fullName`)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number {required && <span className="text-red-500">*</span>}
        </label>
        <Input
          type="tel"
          placeholder="+91 98765 43210"
          error={errors?.phone?.message}
          {...register(`${prefix}.phone`)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
        <Input
          type="email"
          placeholder="name@example.com"
          error={errors?.email?.message}
          {...register(`${prefix}.email`)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Occupation</label>
        <Input
          placeholder="Enter occupation"
          {...register(`${prefix}.occupation`)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Aadhaar Card Number {required && <span className="text-red-500">*</span>}
        </label>
        <Input
          placeholder="1234 5678 9012"
          error={errors?.aadhaarNumber?.message}
          {...register(`${prefix}.aadhaarNumber`)}
        />
      </div>
    </>
  );
}
