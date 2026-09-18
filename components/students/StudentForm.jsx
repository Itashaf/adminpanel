'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FiPlus,
  FiX,
  FiUser,
  FiDroplet,
  FiCalendar,
  FiLayers,
  FiGrid,
  FiCheckSquare,
  FiMap,
  FiFlag,
  FiBook,
  FiUsers,
  FiDollarSign,
} from 'react-icons/fi';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import Button from '@/components/Button';
import FileDropzone from '@/components/FileDropzone';
import DatePicker from '@/components/DatePicker';
import FormSection from './FormSection';
import GuardianFields from './GuardianFields';
import { buildStudentSchema } from '@/lib/schemas';
import {
  GENDERS,
  BLOOD_GROUPS,
  ACADEMIC_SESSIONS,
  STATUSES,
  SCHOOL_BOARDS,
  EMERGENCY_CONTACT_RELATIONSHIPS,
  FEE_STRUCTURE_TYPES,
  FEE_PAYMENT_STATUSES,
} from '@/lib/students';
import { MAX_STUDENT_PHOTO_BYTES, STUDENT_PHOTO_ACCEPT_TYPES } from '@/lib/studentConstants';
import { MAX_DOCUMENT_BYTES, DOCUMENT_ACCEPT_TYPES } from '@/lib/documentConstants';
import { uploadStudentPhoto, uploadStudentDocument } from '@/lib/api';
import { getIndianStates, getCitiesForState, getStateCodeByName, getNationalityOptions } from '@/lib/location';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';

const INDIAN_STATES = getIndianStates();
const NATIONALITY_OPTIONS = getNationalityOptions();

export default function StudentForm({ classOptions, defaultValues, onSubmit: onSubmitProp, submitLabel = 'Save Student', cancelHref = '/dashboard/students' }) {
  const [showSecondaryGuardian, setShowSecondaryGuardian] = useState(
    Boolean(defaultValues?.secondaryGuardian?.fullName)
  );
  const [selectedStateCode, setSelectedStateCode] = useState(() => getStateCodeByName(defaultValues?.state));
  const [formError, setFormError] = useState('');
  const [photo, setPhoto] = useState(defaultValues?.photoUrl || null);
  const [photoError, setPhotoError] = useState('');
  // Father/Mother Photo, Birth Certificate, SLC, Other Document — same
  // "state holds either a File or the already-uploaded URL" pattern as
  // `photo` above, so FileDropzone previews an existing one correctly.
  const [fatherPhoto, setFatherPhoto] = useState(defaultValues?.documents?.fatherPhotoUrl || null);
  const [motherPhoto, setMotherPhoto] = useState(defaultValues?.documents?.motherPhotoUrl || null);
  const [birthCertificate, setBirthCertificate] = useState(defaultValues?.documents?.birthCertificateUrl || null);
  const [slc, setSlc] = useState(defaultValues?.documents?.slcUrl || null);
  const [otherDocument, setOtherDocument] = useState(defaultValues?.documents?.otherDocumentUrl || null);
  const [documentErrors, setDocumentErrors] = useState({});
  const classSections = useClassSections();
  const resolver = useMemo(() => zodResolver(buildStudentSchema(classSections)), [classSections]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({ resolver, defaultValues });

  const selectedClass = watch('class');
  const cityOptions = getCitiesForState(selectedStateCode);
  const sectionOptions = getSectionOptions(classSections, selectedClass);

  const toFileName = (value) => (value instanceof File ? value.name : value);

  // Aadhaar's FileDropzone (student's own, guardian's, secondary guardian's)
  // stays bound to react-hook-form directly (so the schema's `required`
  // validation on the student's own copy still works) — its value is a
  // File, an already-uploaded URL (edited a second time without touching
  // it), or a bare legacy filename (rows saved before this feature existed,
  // no real file ever uploaded). This tells those two apart without
  // re-uploading anything that's already sitting in R2.
  const resolvedDocumentUrl = (value) => {
    if (value instanceof File) return undefined; // uploaded separately in onSubmit
    if (typeof value === 'string' && /^https?:\/\//.test(value)) return value;
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

  const onSubmit = async (data) => {
    setFormError('');
    try {
      const uploadIfFile = (file) => (file instanceof File ? uploadStudentDocument(file) : Promise.resolve(resolvedDocumentUrl(file)));

      const [
        photoUrl,
        aadhaarDocumentUrl,
        guardianAadhaarDocumentUrl,
        secondaryGuardianAadhaarDocumentUrl,
        fatherPhotoUrl,
        motherPhotoUrl,
        birthCertificateUrl,
        slcUrl,
        otherDocumentUrl,
      ] = await Promise.all([
        photo instanceof File ? uploadStudentPhoto(photo) : Promise.resolve(photo),
        uploadIfFile(data.aadhaarDocument),
        uploadIfFile(data.guardian?.aadhaarDocument),
        data.secondaryGuardian ? uploadIfFile(data.secondaryGuardian.aadhaarDocument) : Promise.resolve(undefined),
        uploadIfFile(fatherPhoto),
        uploadIfFile(motherPhoto),
        uploadIfFile(birthCertificate),
        uploadIfFile(slc),
        uploadIfFile(otherDocument),
      ]);

      await onSubmitProp({
        ...data,
        photoUrl,
        aadhaarDocument: toFileName(data.aadhaarDocument),
        aadhaarDocumentUrl,
        guardian: {
          ...data.guardian,
          aadhaarDocument: toFileName(data.guardian.aadhaarDocument),
          aadhaarDocumentUrl: guardianAadhaarDocumentUrl,
        },
        secondaryGuardian: data.secondaryGuardian
          ? {
              ...data.secondaryGuardian,
              aadhaarDocument: toFileName(data.secondaryGuardian.aadhaarDocument),
              aadhaarDocumentUrl: secondaryGuardianAadhaarDocumentUrl,
            }
          : data.secondaryGuardian,
        fatherPhotoUrl,
        motherPhotoUrl,
        birthCertificateUrl,
        slcUrl,
        otherDocumentUrl,
      });
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {formError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {formError}
        </p>
      )}

      <FormSection title="Basic Information" description="Student's personal details">
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
          <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Number</label>
          <Input placeholder="+91 98765 43210" {...register('whatsappNumber')} />
        </div>
      </FormSection>

      <FormSection title="Academic Information" description="Admission and class details">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Admission Number <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="ADM-2026-1048"
            error={errors.admissionNumber?.message}
            {...register('admissionNumber')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Admission Date <span className="text-red-500">*</span>
          </label>
          <Controller
            name="admissionDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="Select admission date"
                error={errors.admissionDate?.message}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Academic Session <span className="text-red-500">*</span>
          </label>
          <Controller
            name="academicSession"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select session"
                icon={<FiCalendar className="w-4 h-4" />}
                options={ACADEMIC_SESSIONS.map((session) => ({ value: session, label: session }))}
                value={field.value}
                onChange={field.onChange}
                error={errors.academicSession?.message}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Class <span className="text-red-500">*</span>
          </label>
          <Controller
            name="class"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select class"
                icon={<FiLayers className="w-4 h-4" />}
                options={classOptions}
                value={field.value}
                onChange={(next) => {
                  field.onChange(next);
                  setValue('section', '');
                }}
                error={errors.class?.message}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Section {sectionOptions.length > 0 && <span className="text-red-500">*</span>}
          </label>
          <Controller
            name="section"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder={
                  !selectedClass ? 'Select a class first' : sectionOptions.length === 0 ? 'No sections for this class' : 'Select section'
                }
                icon={<FiGrid className="w-4 h-4" />}
                options={sectionOptions}
                disabled={!selectedClass || sectionOptions.length === 0}
                value={field.value}
                onChange={field.onChange}
                error={errors.section?.message}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Student Status</label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select status"
                icon={<FiCheckSquare className="w-4 h-4" />}
                options={STATUSES.map((status) => ({ value: status, label: status }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </FormSection>

      <FormSection title="Previous School Details" description="Optional — details of the student's last school">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Previous School Name</label>
          <Input placeholder="Enter previous school name" {...register('previousSchoolName')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Board</label>
          <Controller
            name="previousSchoolBoard"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select board"
                icon={<FiBook className="w-4 h-4" />}
                options={SCHOOL_BOARDS.map((b) => ({ value: b, label: b }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Class Percentage / Marks</label>
          <Input placeholder="e.g. 88%" {...register('lastClassPercentage')} />
        </div>
      </FormSection>

      <FormSection title="Parent / Guardian" description="Primary contact for this student">
        <GuardianFields register={register} control={control} errors={errors.guardian} prefix="guardian" required />
      </FormSection>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-indigo-700">Secondary Parent/Guardian</h2>
            <p className="text-sm text-gray-500 mt-0.5">Optional — add another guardian for this student</p>
          </div>
          <button
            type="button"
            onClick={() => setShowSecondaryGuardian((prev) => !prev)}
            className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            {showSecondaryGuardian ? <FiX className="w-4 h-4" /> : <FiPlus className="w-4 h-4" />}
            {showSecondaryGuardian ? 'Remove' : 'Add Guardian'}
          </button>
        </div>

        {showSecondaryGuardian && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <GuardianFields register={register} control={control} errors={errors.secondaryGuardian} prefix="secondaryGuardian" />
          </div>
        )}
      </div>

      <FormSection title="Emergency Contacts" description="Who to reach in case of an emergency">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Primary Contact Name</label>
          <Input placeholder="Enter contact name" {...register('primaryEmergencyName')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Primary Contact Relationship</label>
          <Controller
            name="primaryEmergencyRelationship"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select relationship"
                icon={<FiUsers className="w-4 h-4" />}
                options={EMERGENCY_CONTACT_RELATIONSHIPS.map((r) => ({ value: r, label: r }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Primary Contact Phone</label>
          <Input type="tel" placeholder="+91 98765 43210" {...register('primaryEmergencyPhone')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Contact Name</label>
          <Input placeholder="Enter contact name" {...register('secondaryEmergencyName')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Contact Relationship</label>
          <Controller
            name="secondaryEmergencyRelationship"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select relationship"
                icon={<FiUsers className="w-4 h-4" />}
                options={EMERGENCY_CONTACT_RELATIONSHIPS.map((r) => ({ value: r, label: r }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Contact Phone</label>
          <Input type="tel" placeholder="+91 98765 43210" {...register('secondaryEmergencyPhone')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Trusted Relative / Guardian Phone</label>
          <Input type="tel" placeholder="+91 98765 43210" {...register('trustedRelativePhone')} />
        </div>
      </FormSection>

      <FormSection title="Address" description="Student's residential address">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address Line 1 <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="House / street address"
            error={errors.addressLine1?.message}
            {...register('addressLine1')}
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
          <Input placeholder="Apartment, landmark, etc." {...register('addressLine2')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State <span className="text-red-500">*</span>
          </label>
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
                error={errors.state?.message}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City <span className="text-red-500">*</span>
          </label>
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
                error={errors.city?.message}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PIN Code <span className="text-red-500">*</span>
          </label>
          <Input placeholder="Enter PIN code" error={errors.pinCode?.message} {...register('pinCode')} />
        </div>
      </FormSection>

      <FormSection title="Fee Details" description="Admission fee, fee structure, and payment status">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Admission Fee Paid Date</label>
          <Controller
            name="admissionFeePaidDate"
            control={control}
            render={({ field }) => (
              <DatePicker value={field.value} onChange={field.onChange} placeholder="Select paid date" />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Admission Fee Amount</label>
          <Input placeholder="e.g. 15000" {...register('admissionFeeAmount')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fee Structure</label>
          <Controller
            name="feeStructureType"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Monthly / Annual"
                icon={<FiDollarSign className="w-4 h-4" />}
                options={FEE_STRUCTURE_TYPES.map((t) => ({ value: t, label: t }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fee Amount</label>
          <Input placeholder="e.g. 6500" {...register('feeStructureAmount')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fee Payment Status</label>
          <Controller
            name="feePaymentStatus"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select status"
                icon={<FiCheckSquare className="w-4 h-4" />}
                options={FEE_PAYMENT_STATUSES.map((s) => ({ value: s, label: s }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Outstanding Dues</label>
          <Input placeholder="e.g. 0" {...register('outstandingDues')} />
        </div>
      </FormSection>

      <FormSection
        title="Documents and Photos"
        description="Aadhaar cards are mandatory; other documents and photos are optional"
        contentClassName="flex flex-wrap gap-4"
      >
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
        <Controller
          name="guardian.aadhaarDocument"
          control={control}
          render={({ field }) => (
            <FileDropzone
              label="Father Aadhaar"
              accept="application/pdf,image/*"
              required
              value={field.value}
              onFileSelect={field.onChange}
              error={errors.guardian?.aadhaarDocument?.message}
            />
          )}
        />
        <Controller
          name="secondaryGuardian.aadhaarDocument"
          control={control}
          render={({ field }) => (
            <FileDropzone
              label="Mother Aadhaar"
              accept="application/pdf,image/*"
              value={field.value}
              onFileSelect={field.onChange}
              error={errors.secondaryGuardian?.aadhaarDocument?.message}
            />
          )}
        />
        <FileDropzone
          label="Student Photo"
          accept="image/jpeg,image/png,image/webp"
          value={photo}
          onFileSelect={handlePhotoSelect}
          error={photoError}
        />
        <FileDropzone
          label="Father Photo"
          accept="image/jpeg,image/png,image/webp"
          value={fatherPhoto}
          onFileSelect={handleDocumentSelect(setFatherPhoto, 'fatherPhoto')}
          error={documentErrors.fatherPhoto}
        />
        <FileDropzone
          label="Mother Photo"
          accept="image/jpeg,image/png,image/webp"
          value={motherPhoto}
          onFileSelect={handleDocumentSelect(setMotherPhoto, 'motherPhoto')}
          error={documentErrors.motherPhoto}
        />
        <FileDropzone
          label="Birth Certificate"
          accept="application/pdf,image/*"
          value={birthCertificate}
          onFileSelect={handleDocumentSelect(setBirthCertificate, 'birthCertificate')}
          error={documentErrors.birthCertificate}
        />
        <FileDropzone
          label="School Leaving Certificate (SLC)"
          accept="application/pdf,image/*"
          value={slc}
          onFileSelect={handleDocumentSelect(setSlc, 'slc')}
          error={documentErrors.slc}
        />
        <FileDropzone
          label="Other Document"
          accept="application/pdf,image/*"
          value={otherDocument}
          onFileSelect={handleDocumentSelect(setOtherDocument, 'otherDocument')}
          error={documentErrors.otherDocument}
        />
      </FormSection>

      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <Link href={cancelHref} className="w-full sm:w-auto">
          <Button label="Cancel" variant="secondary" fullWidth />
        </Link>
        <Button
          type="submit"
          label={isSubmitting ? 'Saving...' : submitLabel}
          disabled={isSubmitting}
          fullWidth={false}
        />
      </div>
    </form>
  );
}
