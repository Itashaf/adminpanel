'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaGraduationCap } from 'react-icons/fa';
import WizardProgress from './WizardProgress';
import StepSchoolInfo from './steps/StepSchoolInfo';
import StepContactAddress from './steps/StepContactAddress';
import StepBranding from './steps/StepBranding';
import StepAcademicSession from './steps/StepAcademicSession';
import StepComplete from './steps/StepComplete';
import { createSchool } from '@/lib/api';

const INITIAL_DATA = {
  name: '',
  code: '',
  principalName: '',
  email: '',
  phone: '',
  addressLine1: '',
  city: '',
  state: '',
  country: '',
  pinCode: '',
  displayName: '',
  logoUrl: '',
  primaryColor: '',
  secondaryColor: '',
  sessionName: '',
  startDate: '',
  endDate: '',
};

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState(INITIAL_DATA);
  const [createError, setCreateError] = useState('');

  const handleStepSubmit = (stepData) => {
    setData((prev) => ({ ...prev, ...stepData }));
    setStep((prev) => prev + 1);
  };

  const handleCreateSchool = async (stepData) => {
    const merged = { ...data, ...stepData };
    setCreateError('');
    try {
      const school = await createSchool(merged);
      setData({ ...merged, id: school.id });
      setStep(5);
    } catch (err) {
      setCreateError(err.message);
    }
  };

  const handleBack = () => setStep((prev) => Math.max(1, prev - 1));

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center gap-3 justify-center mb-8">
        <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-700">
          <FaGraduationCap className="w-6 h-6 text-white" />
        </span>
        <h1 className="text-2xl font-extrabold text-gray-900">SchoolApp 360</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-10">
        {step < 5 && <WizardProgress currentStep={step} />}

        <div className={step < 5 ? 'mt-8' : ''}>
          {step === 1 && <StepSchoolInfo defaultValues={data} onContinue={handleStepSubmit} />}
          {step === 2 && <StepContactAddress defaultValues={data} onBack={handleBack} onContinue={handleStepSubmit} />}
          {step === 3 && <StepBranding defaultValues={data} onBack={handleBack} onContinue={handleStepSubmit} />}
          {step === 4 && (
            <StepAcademicSession
              defaultValues={data}
              onBack={handleBack}
              onContinue={handleCreateSchool}
              submitError={createError}
            />
          )}
          {step === 5 && (
            <StepComplete
              data={data}
              onGoToDashboard={() => router.push('/dashboard')}
              onViewInDirectory={data.id ? () => router.push(`/super-admin/schools/${data.id}`) : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
