import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './nav-bar.jsx';
import './choice.css';
import { generateInterviewQuestions } from './services/geminiService';

function Choice() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    preferredJobRole: '',
    yearsOfExperience: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  // IT Sector Job Roles
  const jobRoles = [
    'Front-end Developer',
    'Back-end Developer',
    'Full-stack Developer',
    'DevOps Engineer',
    'UI/UX Designer',
    'Data Scientist',
    'Machine Learning Engineer',
    'Data Analyst',
    'Database Administrator',
    'Cloud Architect',
    'Software Engineer',
    'System Administrator',
    'Network Engineer',
    'Security Engineer',
    'Mobile App Developer',
    'Game Developer',
    'QA Engineer',
    'Test Automation Engineer',
    'Product Manager',
    'Technical Writer',
    'Business Analyst',
    'Solutions Architect',
    'Site Reliability Engineer',
    'AI Engineer',
    'Blockchain Developer',
    'Cybersecurity Analyst',
    'IT Consultant',
    'Scrum Master',
    'Project Manager (IT)',
    'Technical Lead',
    'Engineering Manager',
    'Chief Technology Officer (CTO)',
    'IT Support Specialist',
    'Help Desk Technician',
    'IT Auditor',
    'Compliance Analyst',
    'Enterprise Architect',
    'Integration Specialist',
    'API Developer',
    'Platform Engineer'
  ];

  const experienceOptions = [
    '1 year',
    '2 years',
    '3 years',
    '4 years',
    '5+ years'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.preferredJobRole) {
      newErrors.preferredJobRole = 'Preferred job role is required';
    }

    if (!formData.yearsOfExperience) {
      newErrors.yearsOfExperience = 'Years of experience is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check if user is logged in
    const token = localStorage.getItem('token');
    const isAuthenticated = token !== null && token !== undefined && token.trim() !== '';

    // Generate session ID
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Store form data in localStorage
    const candidateInfo = {
      ...formData,
      sessionId: sessionId
    };
    localStorage.setItem('candidateInfo', JSON.stringify(candidateInfo));

    // Generate interview questions using Gemini
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const candidateName = `${formData.firstName} ${formData.lastName}`;
      const result = await generateInterviewQuestions({
        jobRole: formData.preferredJobRole,
        yearsOfExperience: formData.yearsOfExperience,
        candidateName: candidateName,
        sessionId: sessionId
      });

      if (result.success) {
        // Store generated questions
        localStorage.setItem('generatedQuestions', JSON.stringify(result.data.questions));
        localStorage.setItem('questionSessionId', sessionId);
        
        // Navigate based on authentication
        if (isAuthenticated) {
          navigate('/interview');
        } else {
          navigate('/login');
        }
      } else {
        setGenerationError(result.error || 'Failed to generate questions. Please try again.');
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      setGenerationError('An error occurred while generating questions. Please try again.');
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Nav-bar */}
      <Navbar />

      {/* Content */}
      <div className="choice-container">
        <div className="choice-header">
          <h1 className="choice-title">Interview Setup</h1>
          <p className="choice-subtitle">Please provide your information to start the interview</p>
        </div>

        <div className="choice-form-wrapper">
          <form className="choice-form" onSubmit={handleSubmit}>
            {/* First Name */}
            <div className="form-field">
              <label htmlFor="firstName">First Name *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Enter your first name"
                className={errors.firstName ? 'error' : ''}
              />
              {errors.firstName && <span className="error-message">{errors.firstName}</span>}
            </div>

            {/* Last Name */}
            <div className="form-field">
              <label htmlFor="lastName">Last Name *</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Enter your last name"
                className={errors.lastName ? 'error' : ''}
              />
              {errors.lastName && <span className="error-message">{errors.lastName}</span>}
            </div>

            {/* Preferred Job Role */}
            <div className="form-field">
              <label htmlFor="preferredJobRole">Preferred Job Role *</label>
              <select
                id="preferredJobRole"
                name="preferredJobRole"
                value={formData.preferredJobRole}
                onChange={handleInputChange}
                className={errors.preferredJobRole ? 'error' : ''}
              >
                <option value="">Select your preferred job role</option>
                {jobRoles.map((role, index) => (
                  <option key={index} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              {errors.preferredJobRole && <span className="error-message">{errors.preferredJobRole}</span>}
            </div>

            {/* Years of Experience */}
            <div className="form-field">
              <label htmlFor="yearsOfExperience">Years of Experience *</label>
              <select
                id="yearsOfExperience"
                name="yearsOfExperience"
                value={formData.yearsOfExperience}
                onChange={handleInputChange}
                className={errors.yearsOfExperience ? 'error' : ''}
              >
                <option value="">Select years of experience</option>
                {experienceOptions.map((exp, index) => (
                  <option key={index} value={exp}>
                    {exp}
                  </option>
                ))}
              </select>
              {errors.yearsOfExperience && <span className="error-message">{errors.yearsOfExperience}</span>}
            </div>

            {/* Error Message */}
            {generationError && (
              <div className="error-message" style={{ 
                marginBottom: '15px', 
                padding: '12px', 
                background: '#fee', 
                border: '1px solid #fcc',
                borderRadius: '4px',
                color: '#c33'
              }}>
                {generationError}
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <i className="fa fa-spinner fa-spin" aria-hidden="true"></i> Generating Questions...
                </>
              ) : (
                <>
                  Continue to Interview <i className="fa fa-arrow-right" aria-hidden="true"></i>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default Choice;
