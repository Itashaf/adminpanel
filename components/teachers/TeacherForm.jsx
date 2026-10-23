'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FiUser,
  FiDroplet,
  FiFlag,
  FiBriefcase,
  FiCheckSquare,
  FiMap,
  FiGrid,
  FiHeart,
  FiUsers,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import DatePicker from '@/components/DatePicker';
import Button from '@/components/Button';
import FileDropzone from '@/components/FileDropzone';
import Toggle from '@/components/Toggle';
import FormSection from './FormSection';
import GuardianFields from '../students/GuardianFields';
import { teacherSchema } from '@/lib/schemas';
import {
  GENDERS,
  BLOOD_GROUPS,
  RELIGIONS,
  GUARDIAN_RELATIONSHIPS,
  EMPLOYMENT_TYPES,
  MARITAL_STATUSES,
  EMERGENCY_RELATIONSHIPS,
} from '@/lib/teacherConstants';
import { getIndianStates, getCitiesForState, getStateCodeByName, getNationalityOptions } from '@/lib/location';
import { STUDENT_PHOTO_ACCEPT_TYPES, MAX_STUDENT_PHOTO_BYTES } from '@/lib/studentConstants';
import { MAX_DOCUMENT_BYTES, DOCUMENT_ACCEPT_TYPES } from '@/lib/documentConstants';
import { uploadTeacherPhoto, uploadTeacherDocument } from '@/lib/api';

const INDIAN_STATES = getIndianStates();
const NATIONALITY_OPTIONS = getNationalityOptions();

export default function TeacherForm({ defaultValues, onSubmit: onSubmitProp, submitLabel = 'Save Teacher', cancelHref = '/dashboard/teachers' }) {
  const [isFresher, setIsFresher] = useState(defaultValues?.isFresher ?? true);
  const [selectedStateCode, setSelectedStateCode] = useState(() => getStateCodeByName(defaultValues?.state));
  const [formError, setFormError] = useState('');
  const [photo, setPhoto] = useState(defaultValues?.photoUrl || null);
  const [photoError, setPhotoError] = useState('');
  const [tenthCertificate, setTenthCertificate] = useState(defaultValues?.documents?.tenthCertificateUrl || null);
  const [twelfthCertificate, setTwelfthCertificate] = useState(defaultValues?.documents?.twelfthCertificateUrl || null);
  const [graduationCertificate, setGraduationCertificate] = useState(defaultValues?.documents?.graduationCertificateUrl || null);
  const [workExperienceCertificate, setWorkExperienceCertificate] = useState(
    defaultValues?.documents?.workExperienceCertificateUrl || null
  );
  const [documentErrors, setDocumentErrors] = useState({});

  const {
    register,
    handleSubmit,
    setValue,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(teacherSchema), defaultValues });

  const { fields: otherEducationFields, append: appendOtherEducation, remove: removeOtherEducation } = useFieldArray({
    control,
    name: 'otherEducation',
  });

  const religion = watch('religion');
  const cityOptions = getCitiesForState(selectedStateCode);

  const handlePhotoSelect = (file) => {
    setPhotoError('');
    if (!file) {
      setPhoto(null);
      return;
    }
    if (!STUDENT_PHOTO_ACCEPT_TYPES.includes(file.type)) {
      setPhotoError('Only JPG, PNG, or WEBP images are allowed.');
      return;
    }
    if (file.size > MAX_STUDENT_PHOTO_BYTES) {
      setPhotoError('Image must be 2MB or smaller.');
      return;
    }
    setPhoto(file);
  };

  // Aadhaar stays bound to react-hook-form (so any schema validation on it
  // keeps working) — its value is a File, an already-uploaded URL (edited a
  // second time without touching it), or a bare legacy filename (rows saved
  // before this existed, no real file ever uploaded). See StudentForm.jsx's
  // matching resolvedDocumentUrl for the same reasoning.
  const resolvedDocumentUrl = (value) => {
    if (value instanceof File) return undefined;
    if (typeof value === 'string' && /^(https?:\/\/|\/api\/documents\/)/.test(value)) return value;
    return null;
  };

  const handleDocumentSelect = (setter, key) => (file) => {
    setDocumentErrors((prev) => ({ ...prev, [key]: '' }));
    if (!file) {
      setter(null);
      return;
    }
    if (!DOCUMENT_ACCEPT_TYPES.includes(file.type)) {
      setDocumentErrors((prev) => ({ ...prev, [key]: 'Only PDF, JPG, PNG, or WEBP files are allowed.' }));
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setDocumentErrors((prev) => ({ ...prev, [key]: 'File must be 5MB or smaller.' }));
      return;
    }
    setter(file);
  };

  const onSubmit = async (data) => {
    setFormError('');
    try {
      const uploadIfFile = (file) => (file instanceof File ? uploadTeacherDocument(file) : Promise.resolve(resolvedDocumentUrl(file)));

      const [photoUrl, aadhaarDocumentUrl, tenthCertificateUrl, twelfthCertificateUrl, graduationCertificateUrl, workExperienceCertificateUrl] =
        await Promise.all([
          photo instanceof File ? uploadTeacherPhoto(photo) : Promise.resolve(photo),
          uploadIfFile(data.aadhaarDocument),
          uploadIfFile(tenthCertificate),
          uploadIfFile(twelfthCertificate),
          uploadIfFile(graduationCertificate),
          uploadIfFile(workExperienceCertificate),
        ]);

      await onSubmitProp({
        ...data,
        photoUrl,
        // Every teacher needs app access, so this is no longer an admin
        // choice — always on, and always the same email they log in with
        // day-to-day (the main Email field above), not a separate one.
        loginAccessEnabled: true,
        loginEmail: data.email,
        isFresher,
        aadhaarDocument: data.aadhaarDocument instanceof File ? data.aadhaarDocument.name : data.aadhaarDocument,
        aadhaarDocumentUrl,
        tenthCertificateUrl,
        twelfthCertificateUrl,
        graduationCertificateUrl,
        workExperienceCertificateUrl,
      });
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {formError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
      )}

      <FormSection title="Personal Information">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name <span className="text-red-500">*</span>
          </label>
          <Input placeholder="Enter first name" error={errors.firstName?.message} {...register('firstName')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
          <Input placeholder="Enter middle name" {...register('middleName')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name <span className="text-red-500">*</span>
          </label>
          <Input placeholder="Enter last name" error={errors.lastName?.message} {...register('lastName')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <Controller
            name="dob"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="Select date of birth"
                error={errors.dob?.message}
                maxYear={new Date().getFullYear()}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gender <span className="text-red-500">*</span>
          </label>
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select gender"
                icon={<FiUser className="w-4 h-4" />}
                options={GENDERS.map((g) => ({ value: g, label: g }))}
                value={field.value}
                onChange={field.onChange}
                error={errors.gender?.message}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
          <Controller
            name="bloodGroup"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select blood group"
                icon={<FiDroplet className="w-4 h-4" />}
                options={BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <Input type="tel" placeholder="+91 98765 43210" error={errors.phone?.message} {...register('phone')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <Input type="email" placeholder="name@school.com" error={errors.email?.message} {...register('email')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Aadhaar Card Number <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="1234 5678 9012"
            error={errors.aadhaarNumber?.message}
            {...register('aadhaarNumber')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
          <Controller
            name="maritalStatus"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select marital status"
                icon={<FiHeart className="w-4 h-4" />}
                options={MARITAL_STATUSES.map((s) => ({ value: s, label: s }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nationality</label>
          <Controller
            name="nationality"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select nationality"
                icon={<FiFlag className="w-4 h-4" />}
                options={NATIONALITY_OPTIONS}
                searchable
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Religion</label>
          <Controller
            name="religion"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select or type religion"
                icon={<FiFlag className="w-4 h-4" />}
                options={RELIGIONS.map((r) => ({ value: r, label: r }))}
                searchable
                creatable
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        {religion === 'Other' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specify Religion</label>
            <Input placeholder="Type religion" {...register('religionOther')} />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Caste</label>
          <Input placeholder="e.g. General" {...register('caste')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number</label>
          <Input placeholder="ABCDE1234F" error={errors.panNumber?.message} {...register('panNumber')} />
        </div>
      </FormSection>

      <FormSection title="Father Details (Optional)">
        <GuardianFields register={register} control={control} errors={errors.father} prefix="father" hideRelationship />
      </FormSection>

      <FormSection title="Mother Details (Optional)">
        <GuardianFields register={register} control={control} errors={errors.mother} prefix="mother" hideRelationship />
      </FormSection>

      <FormSection title="Guardian Details (Optional)">
        <GuardianFields
          register={register}
          control={control}
          errors={errors.guardian}
          prefix="guardian"
          relationshipOptions={GUARDIAN_RELATIONSHIPS}
        />
      </FormSection>

      <FormSection title="Documents and Photos" contentClassName="flex flex-wrap gap-4">
        <Controller
          name="aadhaarDocument"
          control={control}
          render={({ field }) => (
            <FileDropzone
              label="Aadhaar Card"
              accept="application/pdf,image/*"
              required
              value={field.value}
              onFileSelect={field.onChange}
              error={errors.aadhaarDocument?.message}
            />
          )}
        />
        <FileDropzone
          label="Profile Photo"
          accept="image/jpeg,image/png,image/webp"
          value={photo}
          onFileSelect={handlePhotoSelect}
          error={photoError}
        />
        <FileDropzone
          label="10th Certificate"
          accept="application/pdf,image/*"
          value={tenthCertificate}
          onFileSelect={handleDocumentSelect(setTenthCertificate, 'tenthCertificate')}
          error={documentErrors.tenthCertificate}
        />
        <FileDropzone
          label="12th Certificate"
          accept="application/pdf,image/*"
          value={twelfthCertificate}
          onFileSelect={handleDocumentSelect(setTwelfthCertificate, 'twelfthCertificate')}
          error={documentErrors.twelfthCertificate}
        />
        <FileDropzone
          label="Graduation Certificate"
          accept="application/pdf,image/*"
          value={graduationCertificate}
          onFileSelect={handleDocumentSelect(setGraduationCertificate, 'graduationCertificate')}
          error={documentErrors.graduationCertificate}
        />
      </FormSection>

      <FormSection title="Education Details (Optional)">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">10th Marks / Percentage</label>
          <Input placeholder="e.g. 88%" {...register('tenthPercentage')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">12th Marks / Percentage</label>
          <Input placeholder="e.g. 91%" {...register('twelfthPercentage')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Graduation Degree</label>
          <Input placeholder="e.g. M.Sc. Mathematics" {...register('graduationDegree')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">University / College</label>
          <Input placeholder="e.g. University of Lucknow" {...register('graduationUniversity')} />
        </div>

        <div className="sm:col-span-2 lg:col-span-3 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between mt-4 mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Other Degrees / Diplomas / Courses (optional)</h3>
            <button
              type="button"
              onClick={() => appendOtherEducation({ name: '', institution: '', year: '' })}
              className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              <FiPlus className="w-4 h-4" />
              Add Education
            </button>
          </div>

          {otherEducationFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Degree / Diploma / Course</label>
                <Input placeholder="e.g. PGDCA" {...register(`otherEducation.${index}.name`)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Institution</label>
                <Input placeholder="e.g. IGNOU" {...register(`otherEducation.${index}.institution`)} />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <Input placeholder="e.g. 2019" {...register(`otherEducation.${index}.year`)} />
                </div>
                <button
                  type="button"
                  onClick={() => removeOtherEducation(index)}
                  className="h-[42px] w-[42px] shrink-0 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 cursor-pointer"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="Professional Information">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee ID <span className="text-red-500">*</span>
          </label>
          <Input placeholder="TCH-2026-007" error={errors.employeeId?.message} {...register('employeeId')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Joining Date <span className="text-red-500">*</span>
          </label>
          <Controller
            name="joiningDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="Select joining date"
                error={errors.joiningDate?.message}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Relieving Date</label>
          <Controller
            name="relievingDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="Still serving"
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Experience</label>
          <Input placeholder="e.g. 7 years" {...register('experience')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employment Type <span className="text-red-500">*</span>
          </label>
          <Controller
            name="employmentType"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select type"
                icon={<FiBriefcase className="w-4 h-4" />}
                options={EMPLOYMENT_TYPES.map((t) => ({ value: t, label: t }))}
                value={field.value}
                onChange={field.onChange}
                error={errors.employmentType?.message}
              />
            )}
          />
        </div>
      </FormSection>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-indigo-700">Documents & Verification (Optional)</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account Holder Name</label>
            <Input placeholder="As per bank records" {...register('bankAccountHolderName')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
            <Input placeholder="e.g. State Bank of India" {...register('bankName')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
            <Input placeholder="Enter account number" {...register('bankAccountNumber')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
            <Input placeholder="e.g. SBIN0001234" {...register('bankIFSC')} />
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100">
          <Toggle
            checked={isFresher}
            onChange={setIsFresher}
            label="This is a fresher (no prior work experience)"
            description="Turn off to attach an experience certificate from a previous employer."
          />

          {!isFresher && (
            <div className="mt-4">
              <FileDropzone
                label="Work Experience Certificate"
                accept="application/pdf,image/*"
                value={workExperienceCertificate}
                onFileSelect={handleDocumentSelect(setWorkExperienceCertificate, 'workExperienceCertificate')}
                error={documentErrors.workExperienceCertificate}
              />
            </div>
          )}
        </div>
      </div>

      <FormSection title="Emergency Contact (Optional)">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
          <Input placeholder="Enter contact name" {...register('emergencyContactName')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
          <Input type="tel" placeholder="+91 98765 43210" {...register('emergencyContactPhone')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Relationship with Employee</label>
          <Controller
            name="emergencyContactRelationship"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select relationship"
                icon={<FiUsers className="w-4 h-4" />}
                options={EMERGENCY_RELATIONSHIPS.map((r) => ({ value: r, label: r }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </FormSection>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-indigo-700">Address (Optional)</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
            <Input placeholder="House / street address" {...register('addressLine1')} />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
            <Input placeholder="Apartment, landmark, etc." {...register('addressLine2')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <Dropdown
                  placeholder="Select state"
                  icon={<FiMap className="w-4 h-4" />}
                  options={INDIAN_STATES}
                  searchable
                  value={selectedStateCode}
                  onChange={(isoCode) => {
                    setSelectedStateCode(isoCode);
                    const stateOption = INDIAN_STATES.find((state) => state.value === isoCode);
                    field.onChange(stateOption?.label || '');
                    setValue('city', '');
                  }}
                />
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <Dropdown
                  placeholder={selectedStateCode ? 'Select city' : 'Select a state first'}
                  icon={<FiGrid className="w-4 h-4" />}
                  options={cityOptions}
                  searchable
                  disabled={!selectedStateCode}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">PIN Code</label>
            <Input placeholder="Enter PIN code" {...register('pinCode')} />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <Link href={cancelHref} className="w-full sm:w-auto">
          <Button label="Cancel" variant="secondary" fullWidth />
        </Link>
        <Button type="submit" label={isSubmitting ? 'Saving...' : submitLabel} disabled={isSubmitting} fullWidth={false} />
      </div>
    </form>
  );
}
